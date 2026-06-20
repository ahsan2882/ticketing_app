import type { JsMsg, NatsConnection } from "nats";
import { Listener } from "./base-listener";
import { SUBJECTS, type TicketCreatedEvent } from "./events";

export class TicketCreatedListener extends Listener<TicketCreatedEvent> {
  readonly subject = SUBJECTS.TicketCreated;
  readonly durableName = "orders-service";

  constructor(client: NatsConnection) {
    super(client);
  }

  protected async onMessage(
    data: TicketCreatedEvent["data"],
    msg: JsMsg,
  ): Promise<void> {
    console.log(`Received event #${msg.seq}:`, data);
  }
}
