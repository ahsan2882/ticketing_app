import type { JsMsg, NatsConnection } from "nats";
import { Listener, SUBJECTS, type TicketCreatedEvent } from "@venuepass/common";
import { Ticket } from "../../models/ticket.model";

export class TicketCreatedListener extends Listener<TicketCreatedEvent> {
  readonly subject = SUBJECTS.TicketCreated;
  readonly durableName: string;

  constructor(
    client: NatsConnection,
    durableName = "orders-service-ticket-created",
  ) {
    super(client);
    this.durableName = durableName;
  }

  async onMessage(data: TicketCreatedEvent["data"], msg: JsMsg): Promise<void> {
    const { id } = data;
    // Check if ticket already exists to handle redelivered messages idempotently
    const existingTicket = await Ticket.findById(id);
    if (existingTicket) {
      // Ticket already exists, treat as already processed
      msg.ack();
      return;
    }

    const ticket = Ticket.build({
      title: data.title,
      price: data.price,
      userId: data.userId,
      id,
    });
    await ticket.save();
    msg.ack();
  }
}
