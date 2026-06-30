import {
  Listener,
  SUBJECTS,
  TicketStatus,
  type OrderCreatedEvent,
} from "@venuepass/common";
import type { JsMsg, NatsConnection } from "nats";
import { Ticket } from "../../models/ticket.model";
import { TicketUpdatedPublisher } from "../publishers/ticket-updated-publisher";

export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
  readonly subject = SUBJECTS.OrderCreated;
  readonly durableName: string;

  constructor(
    client: NatsConnection,
    durableName = "tickets-service-order-created",
  ) {
    super(client);
    this.durableName = durableName;
  }

  async onMessage(data: OrderCreatedEvent["data"], msg: JsMsg): Promise<void> {
    const ticketId = data.ticket.id;

    // Idempotency guard: only apply this event if we haven't already processed it.
    // Using version-based atomic check to prevent race conditions on redelivery.
    const ticket = await Ticket.findOneAndUpdate(
      { _id: ticketId, status: TicketStatus.AVAILABLE },
      {
        $set: { status: TicketStatus.RESERVED, orderId: data.id },
        $inc: { version: 1 },
      },
      { returnDocument: "after" },
    );

    if (!ticket) {
      const existing = await Ticket.findById(ticketId);
      if (!existing) {
        throw new Error("Ticket not found");
      }

      // Idempotency check using version from the update: if ticket already has this order,
      // we've either processed it before (redelivered event) or another worker handled it.
      if (existing.orderId === data.id) {
        // Same event redelivered after we already applied it — genuinely benign, idempotent no-op.
        msg.ack();
        return;
      }

      // The ticket is not AVAILABLE and the order holding it is NOT the order in this event.
      // This should not be reachable if orders-service's own reservation check (unique partial
      // index + isReserved()) is working correctly — it implies a ticket was double-booked upstream.
      // Treat as a no-op for THIS event (we still ack, since redelivering won't change the outcome),
      // but surface it loudly since it represents a real consistency problem worth investigating.
      console.error(
        `OrderCreatedListener: ticket ${ticketId} is in status ${existing.status} ` +
          `held by order ${existing.orderId}, but received OrderCreated for a different order ${data.id}. ` +
          `This indicates a possible double-booking that should have been prevented upstream by orders-service.`,
      );
      msg.ack();
      return;
    }

    await new TicketUpdatedPublisher(this.client).publish({
      id: ticket.id,
      title: ticket.title,
      price: ticket.price,
      userId: ticket.userId,
      status: ticket.status,
      version: ticket.version,
    });
    msg.ack();
  }
}
