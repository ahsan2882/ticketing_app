import { SUBJECTS } from "@venuepass/common";
import { natsClient } from "../../../nats-client";
import { OrderAwaitingPaymentPublisher } from "../order-awaiting-payment-publisher";
import { OrderCancelledPublisher } from "../order-cancelled-publisher";
import { OrderCompletedPublisher } from "../order-completed-publisher";
import { OrderCreatedPublisher } from "../order-created-publisher";
import { PaymentRefundPublisher } from "../payment-refund-publisher";

describe("order service publishers", () => {
  it.each([
    [OrderCreatedPublisher, SUBJECTS.OrderCreated],
    [OrderCancelledPublisher, SUBJECTS.OrderCancelled],
    [OrderCompletedPublisher, SUBJECTS.OrderCompleted],
    [OrderAwaitingPaymentPublisher, SUBJECTS.OrderAwaitingPayment],
    [PaymentRefundPublisher, SUBJECTS.PaymentRefund],
  ])("uses the correct subject for %p", (PublisherClass, expectedSubject) => {
    const publisher = new PublisherClass(natsClient.client);

    expect(publisher.subject).toEqual(expectedSubject);
  });
});
