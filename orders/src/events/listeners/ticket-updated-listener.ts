import {
  Listener,
  OrderStatus,
  SUBJECTS,
  TicketStatus,
  type TicketUpdatedEvent,
} from "@venuepass/common";
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
      const updateResult = await Ticket.updateOne(
        { _id: id, version: ticket.version },
        {
          $set: { title, price },
          $inc: { version: 1 },
        },
      );

      // The version-gated filter can match zero documents if another
      // writer (a concurrent redeliver, or a second instance of this
      // service consuming the same durable consumer) already advanced
      // the ticket's version between our findById above and this update.
      // If that happens, we did NOT apply this event — nak for redelivery
      // rather than silently acking a no-op. On redelivery, the
      // findById/version check above will correctly re-evaluate against
      // the now-current state.
      if (updateResult.matchedCount === 0) {
        console.warn(
          `Ticket ${id} version changed concurrently — expected version ${ticket.version}, update did not apply. Requesting redelivery.`,
        );
        msg.nak();
        return;
      }

      // If the ticket was just reserved, the order that triggered the
      // reservation can move past CREATED. Guarded on status: CREATED
      // so this is a no-op if the order has already advanced (idempotent
      // against redelivery of this same TicketUpdatedEvent).
      if (status === TicketStatus.RESERVED) {
        await Order.updateOne(
          { ticket: id, status: OrderStatus.CREATED },
          {
            $set: { status: OrderStatus.AWAITING_PAYMENT },
            $inc: { version: 1 },
          },
        );
        const order = await Order.findOne({
          ticket: id,
          status: OrderStatus.AWAITING_PAYMENT,
        }).populate("ticket");
        if (!order) {
          throw new Error(
            `Order with ticket id and AWAITING_PAYMENT status not found for ticket ${id}`,
          );
        }
        const freshTicket = await Ticket.findById(id);
        if (!freshTicket) {
          throw new Error(`Ticket with id ${id} not found after update`);
        }
        freshTicket.set({ orderId: order.id });
        await freshTicket.save();
        await new OrderAwaitingPaymentPublisher(this.client).publish({
          id: order.id,
          userId: order.userId,
          status: order.status,
          version: order.version,
          ticket: order.ticket,
        });
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
