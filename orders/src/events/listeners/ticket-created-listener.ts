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

  protected async onMessage(
    data: TicketCreatedEvent["data"],
    msg: JsMsg,
  ): Promise<void> {
    const { id, title, price, userId } = data;
    const ticket = Ticket.build({ title, price, userId, id });
    await ticket.save();
    console.log(`Received event #${msg.seq}:`, data);
    msg.ack();
  }
}
