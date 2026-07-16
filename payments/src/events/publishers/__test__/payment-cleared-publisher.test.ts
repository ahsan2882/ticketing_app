import { SUBJECTS } from "@venuepass/common";
import { natsClient } from "../../../nats-client";
import { PaymentClearedPublisher } from "../payment-cleared-publisher";

describe("PaymentClearedPublisher", () => {
  it("publishes payment-cleared events on the PaymentCleared subject", () => {
    const publisher = new PaymentClearedPublisher(natsClient.client);

    expect(publisher.subject).toEqual(SUBJECTS.PaymentCleared);
  });
});
