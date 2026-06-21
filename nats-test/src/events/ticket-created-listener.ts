import type { JsMsg, NatsConnection } from "nats";
import { Listener } from "./base-listener";
import { SUBJECTS, type TicketCreatedEvent } from "./events";

export class TicketCreatedListener extends Listener<TicketCreatedEvent> {
  readonly subject = SUBJECTS.TicketCreated;
  readonly durableName: string;

  constructor(client: NatsConnection, durableName = "orders-service") {
    super(client);
    this.durableName = durableName;
  }

  protected async onMessage(
    data: TicketCreatedEvent["data"],
    msg: JsMsg,
  ): Promise<void> {
    console.log(`Received event #${msg.seq}:`, data);
  }
}
