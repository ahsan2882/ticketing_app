import mongoose from "mongoose";
import { Payment } from "../payment.model";

const validAttrs = () => ({
  orderId: new mongoose.Types.ObjectId().toHexString(),
  stripeId: `pi_${new mongoose.Types.ObjectId().toHexString()}`,
});

describe("Payment model", () => {
  it("builds and persists a payment with the supplied fields", async () => {
    const attrs = validAttrs();
    const payment = Payment.build(attrs);

    await payment.save();

    expect(payment.orderId).toEqual(attrs.orderId);
    expect(payment.stripeId).toEqual(attrs.stripeId);
  });

  it.each(["orderId", "stripeId"] as const)(
    "rejects a payment missing the required field: %s",
    async (field) => {
      const attrs = validAttrs();
      delete (attrs as any)[field];

      const payment = Payment.build(attrs as any);

      await expect(payment.save()).rejects.toThrow();
    },
  );

  it("defaults published to false", async () => {
    const payment = Payment.build(validAttrs());

    await payment.save();

    expect(payment.published).toBe(false);
  });

  it("persists the published delivery marker", async () => {
    const payment = Payment.build(validAttrs());
    payment.set({ published: true });

    await payment.save();

    const persisted = await Payment.findById(payment.id);
    expect(persisted?.published).toBe(true);
  });

  it("enforces a unique Stripe PaymentIntent id", async () => {
    await Payment.init();
    const attrs = validAttrs();

    await Payment.build(attrs).save();

    await expect(
      Payment.build({
        orderId: new mongoose.Types.ObjectId().toHexString(),
        stripeId: attrs.stripeId,
      }).save(),
    ).rejects.toMatchObject({ code: 11000 });
  });

  it("serializes id, orderId, and stripeId without internal delivery state", async () => {
    const attrs = validAttrs();
    const payment = Payment.build(attrs);
    payment.set({ published: true });
    await payment.save();

    const json = payment.toJSON();

    expect(json).toEqual({
      id: payment.id,
      orderId: attrs.orderId,
      stripeId: attrs.stripeId,
    });
    expect(json).not.toHaveProperty("_id");
    expect(json).not.toHaveProperty("__v");
    expect(json).not.toHaveProperty("published");
  });
});
