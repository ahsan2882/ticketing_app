import { Listener, SUBJECTS, type TicketUpdatedEvent } from "@venuepass/common";
import { OrderStatus, TicketStatus } from "@venuepass/common/client";
import type { JsMsg, NatsConnection } from "nats";
import { Order } from "../../models/order.model";
import { Ticket } from "../../models/ticket.model";
import { OrderAwaitingPaymentPublisher } from "../publishers/order-awaiting-payment-publisher";

export class TicketUpdatedListener extends Listener<TicketUpdatedEvent> {
  readonly subject = SUBJECTS.TicketUpdated;
  readonly durableName: string;

  constructor(
    client: NatsConnection,
    durableName = "orders-service-ticket-updated",
  ) {
    super(client);
    this.durableName = durableName;
  }

  async onMessage(data: TicketUpdatedEvent["data"], msg: JsMsg): Promise<void> {
    const { id, title, price, version, status } = data;
    // Fetch current ticket state with single DB query for performance
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      throw new Error(`Ticket with id ${id} not found`);
    }

    // Case 1: Process the event if version is exactly one more than current
    if (version === ticket.version + 1) {
      const session = await Ticket.startSession();
      let versionConflict = false;
      let publishPayload: {
        id: string;
        userId: string;
        status: OrderStatus;
        version: number;
        ticket: any;
      } | null = null;

      try {
        await session.withTransaction(async () => {
          // Ticket version bump and the order transition below now
          // commit atomically. If either step fails, the whole
          // transaction rolls back, so redelivery re-evaluates from
          // scratch instead of getting stuck acking a half-applied
          // update in Case 2.
          const updateResult = await Ticket.updateOne(
            { _id: id, version: ticket.version },
            {
              $set: { title, price },
              $inc: { version: 1 },
            },
            { session },
          );

          if (updateResult.matchedCount === 0) {
            versionConflict = true;
            return;
          }

          if (status === TicketStatus.RESERVED) {
            await Order.updateOne(
              { ticket: id, status: OrderStatus.CREATED },
              {
                $set: { status: OrderStatus.AWAITING_PAYMENT },
                $inc: { version: 1 },
              },
              { session },
            );
            const order = await Order.findOne({
              ticket: id,
              status: OrderStatus.AWAITING_PAYMENT,
            })
              .session(session)
              .populate("ticket");
            if (!order) {
              throw new Error(
                `Order with ticket id and AWAITING_PAYMENT status not found for ticket ${id}`,
              );
            }
            // Plain updateOne, not findById + save() — setting orderId is
            // bookkeeping, not a real version-worthy state change. The
            // Ticket.updateOne above already advanced version to n+1 for
            // this event; reloading and saving the document would bump it
            // again to n+2 via optimisticConcurrency, desyncing this
            // read-replica's version from the tickets-service original.
            await Ticket.updateOne(
              { _id: id },
              { $set: { orderId: order.id } },
              { session },
            );

            publishPayload = {
              id: order.id,
              userId: order.userId,
              status: order.status,
              version: order.version,
              ticket: order.ticket,
            };
          }
        });
      } finally {
        await session.endSession();
      }

      if (versionConflict) {
        console.warn(
          `Ticket ${id} version changed concurrently — expected version ${ticket.version}, update did not apply. Requesting redelivery.`,
        );
        msg.nak();
        return;
      }

      // Publish is still a separate side effect outside the DB
      // transaction (the classic dual-write gap already tracked
      // elsewhere in this codebase) — but the DB state itself is now
      // consistent before we ever get here, so a crash before ack
      // just means safe redelivery, and a crash after commit but
      // before publish means Case 2 correctly no-ops on retry.
      if (publishPayload) {
        await new OrderAwaitingPaymentPublisher(this.client).publish(
          publishPayload,
        );
      }

      console.log(`Received event #${msg.seq}:`, data);
      msg.ack();
    }
    // Case 2: Already processed this version or stale (duplicate/out-of-order)
    else if (version <= ticket.version) {
      msg.ack();
    }
    // Case 3: Out-of-order gap - request redelivery with exponential backoff
    else {
      console.warn(
        `Out-of-order: expected version ${ticket.version + 1}, got ${version}`,
      );

      const deliveryCount = msg.info?.deliveryCount || 1;
      // Calculate exponential backoff delay (cap at 3 seconds)
      const backoffMs = Math.min(3_000, Math.pow(2, deliveryCount - 1) * 100);

      msg.nak(backoffMs); // Tell NATS to keep trying after delay
    }
  }
}
