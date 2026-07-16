import { SUBJECTS } from "@venuepass/common";
import { natsClient } from "../../../nats-client";
import { TicketCreatedPublisher } from "../ticket-created-publisher";
import { TicketUpdatedPublisher } from "../ticket-updated-publisher";

describe("ticket event publishers", () => {
  it("publishes ticket-created events on the TicketCreated subject", () => {
    const publisher = new TicketCreatedPublisher(natsClient.client);

    expect(publisher.subject).toEqual(SUBJECTS.TicketCreated);
  });

  it("publishes ticket-updated events on the TicketUpdated subject", () => {
    const publisher = new TicketUpdatedPublisher(natsClient.client);

    expect(publisher.subject).toEqual(SUBJECTS.TicketUpdated);
  });
});
