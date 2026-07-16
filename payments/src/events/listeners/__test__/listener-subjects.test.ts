import { SUBJECTS } from "@venuepass/common";
import { natsClient } from "../../../nats-client";
import { OrderAwaitingPaymentListener } from "../order-awaiting-payment-listener";
import { OrderCancelledListener } from "../order-cancelled-listener";
import { OrderCompletedListener } from "../order-completed-listener";
import { OrderCreatedListener } from "../order-created-listener";
import { PaymentRefundListener } from "../payment-refund-listener";

describe("existing order listener subjects", () => {
  it("uses OrderCreated for the created-order projection listener", () => {
    const listener = new OrderCreatedListener(natsClient.client);

    expect(listener.subject).toEqual(SUBJECTS.OrderCreated);
  });

  it("uses OrderCancelled for the cancellation listener", () => {
    const listener = new OrderCancelledListener(natsClient.client);

    expect(listener.subject).toEqual(SUBJECTS.OrderCancelled);
  });

  it("uses OrderAwaitingPayment for the awaiting-payment listener", () => {
    const listener = new OrderAwaitingPaymentListener(natsClient.client);

    expect(listener.subject).toEqual(SUBJECTS.OrderAwaitingPayment);
  });

  it("uses OrderCompleted for the order-completed listener", () => {
    const listener = new OrderCompletedListener(natsClient.client);

    expect(listener.subject).toEqual(SUBJECTS.OrderCompleted);
  });

  it("uses PaymentRefund for the payment-refund listener", () => {
    const listener = new PaymentRefundListener(natsClient.client);

    expect(listener.subject).toEqual(SUBJECTS.PaymentRefund);
  });
});
