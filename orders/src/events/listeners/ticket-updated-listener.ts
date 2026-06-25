import type { JsMsg, NatsConnection } from "nats";
import {
  Listener,
  NotFoundError,
  SUBJECTS,
  type TicketUpdatedEvent,
} from "@venuepass/common";
import { Ticket } from "../../models/ticket.model";

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

  protected async onMessage(
    data: TicketUpdatedEvent["data"],
    msg: JsMsg,
  ): Promise<void> {
    const { id, title, price, version } = data;

    // Fetch current ticket state with single DB query for performance
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      throw new Error(`Ticket with id ${id} not found`);
    }

    // Case 1: Process the event if version is exactly one more than current
    if (version === ticket.version + 1) {
      ticket.set({ title, price });
      await ticket.save();
      console.log(`Received event #${msg.seq}:`, data);
      msg.ack();
    }
    // Case 2: Already processed this version or stale (duplicate/out-of-order)
    else if (version <= ticket.version) {
      msg.ack();
    }
    // Case 3: Out-of-order gap - request redelivery with backoff
    else {
      console.warn(
        `Out-of-order: expected version ${ticket.version + 1}, got ${version}`,
      );
      msg.nak(); // Tell NATS to keep trying with exponential backoff
    }
  }
}
