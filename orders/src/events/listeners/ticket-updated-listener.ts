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
    const { title, price } = data;
    // const storedTicket = await Ticket.findById(data.id);
    // if (!storedTicket) {
    //   throw new Error(`Ticket with id ${data.id} not found`);
    // }
    // if (data.version <= storedTicket.version) {
    //   console.log("Already processed this event");
    //   msg.ack();
    //   return;
    // }
    // if (data.version !== storedTicket.version + 1) {
    //   if (msg.info.deliveryCount >= 5) {
    //     console.error("Poison message: version gap never resolved", {
    //       ticketId: data.id,
    //       expected: storedTicket.version + 1,
    //       received: data.version,
    //       deliveryCount: msg.info.deliveryCount,
    //     });
    //     msg.ack(); // ack to stop further redelivery — we've handled it
    //     return;
    //   }
    //   throw new Error(
    //     `Out-of-order: expected version ${storedTicket.version + 1}, got ${data.version}`,
    //   );
    // }
    const ticket = await Ticket.findByEvent(data);
    if (!ticket) {
      throw new Error("Ticket not found");
    }
    ticket.set({ title, price });
    await ticket.save();
    console.log(`Received event #${msg.seq}:`, data);
    msg.ack();
  }
}
