import {
  Listener,
  SUBJECTS,
  TicketStatus,
  type OrderCancelledEvent,
} from "@venuepass/common";
import type { JsMsg, NatsConnection } from "nats";
import { Ticket } from "../../models/ticket.model";
import { TicketUpdatedPublisher } from "../publishers/ticket-updated-publisher";

export class OrderCancelledListener extends Listener<OrderCancelledEvent> {
  readonly subject = SUBJECTS.OrderCancelled;
  readonly durableName: string;

  constructor(
    client: NatsConnection,
    durableName = "tickets-service-order-cancelled",
  ) {
    super(client);
    this.durableName = durableName;
  }

  async onMessage(
    data: OrderCancelledEvent["data"],
    msg: JsMsg,
  ): Promise<void> {
    const ticketId = data.ticket.id;
    const ticket = await Ticket.findOneAndUpdate(
      { _id: ticketId, status: TicketStatus.RESERVED, orderId: data.id },
      {
        $set: { status: TicketStatus.AVAILABLE },
        $unset: { orderId: 1 },
        $inc: { version: 1 },
      },
      { returnDocument: "after" },
    );
    if (!ticket) {
      const exists = await Ticket.exists({ _id: ticketId });
      if (!exists) {
        throw new Error("Ticket not found");
      }
      console.warn(
        `OrderCancelledListener no-op for order ${data.id}, ticket ${ticketId}: ticket not in a cancellable state for this order (already released, sold, or reserved by a different order).`,
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
