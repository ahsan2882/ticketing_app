import { OrderStatus } from "@venuepass/common";
import express, { type Request, type Response } from "express";
import mongoose from "mongoose";
import Stripe from "stripe";
import { PaymentClearedPublisher } from "../events/publishers/payment-cleared-publisher";
import { Order } from "../models/order.model";
import { Payment, type PaymentDoc } from "../models/payment.model";
import { natsClient } from "../nats-client";
import { stripe } from "../stripe";

const router = express.Router();
router.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"];

    if (!signature) {
      return res.status(400).send("Missing Stripe signature");
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err) {
      return res.status(400).send("Invalid Stripe webhook signature");
    }
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      const orderId = paymentIntent.metadata.orderId;

      if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
        return res.status(400).send("Invalid or missing metadata.orderId");
      }

      const order = await Order.findById(orderId);

      if (!order) {
        return res.status(404).send("Order not found");
      }

      if (order.status === OrderStatus.COMPLETED) {
        return res.status(200).send({ received: true });
      }
      if (order.status === OrderStatus.CANCELLED) {
        try {
          await stripe.refunds.create(
            { payment_intent: paymentIntent.id },
            { idempotencyKey: `refund_${paymentIntent.id}` },
          );
        } catch (err) {
          // Ignore "already refunded" style errors so retries don't loop forever
        }
        return res.status(200).send({ received: true });
      }
      // Check for existing payment by Stripe ID to prevent duplicates on redelivery
      let existingPayment: PaymentDoc | null;
      try {
        existingPayment = await Payment.findOne({ stripeId: paymentIntent.id });
        if (existingPayment) {
          // A Payment doc existing only means the save happened — it does
          // NOT mean the publish happened. If a prior delivery crashed or
          // errored between save() and publish(), we still owe the world
          // a PaymentClearedEvent. Retry it here instead of assuming done.
          if (!existingPayment.published) {
            await new PaymentClearedPublisher(natsClient.client).publish({
              orderId: order.id,
              stripeId: paymentIntent.id,
            });
            existingPayment.set({ published: true });
            await existingPayment.save();
          }
          return res.status(200).send({ received: true });
        }
      } catch (err) {
        // Handle any errors during the lookup as a best-effort safety check
      }

      const payment = Payment.build({
        orderId: order.id,
        stripeId: paymentIntent.id,
      });

      // Attempt to save, catching duplicate key errors for idempotency
      try {
        await payment.save();
      } catch (err) {
        const mongoError = err as any;
        if (
          typeof mongoError === "object" &&
          mongoError !== null &&
          typeof mongoError.code === "number" &&
          mongoError.code === 11000 && // MongoDB duplicate key error
          (mongoError.keyPattern?.stripeId as string | undefined) ===
            paymentIntent.id
        ) {
          // Another request created a Payment with this stripeId before we did.
          // Same reasoning as above: existence of the doc doesn't guarantee
          // publish happened, so fetch it and retry publish if needed.
          const winningPayment = await Payment.findOne({
            stripeId: paymentIntent.id,
          });
          if (winningPayment && !winningPayment.published) {
            await new PaymentClearedPublisher(natsClient.client).publish({
              orderId: order.id,
              stripeId: paymentIntent.id,
            });
            winningPayment.set({ published: true });
            await winningPayment.save();
          }
          return res.status(200).send({ received: true });
        }
        // Re-throw any other errors
        throw err;
      }

      await new PaymentClearedPublisher(natsClient.client).publish({
        orderId: order.id,
        stripeId: paymentIntent.id,
      });
      payment.set({ published: true });
      await payment.save();
    }

    res.status(200).send({ received: true });
  },
);

export { router as stripeWebhookRouter };
