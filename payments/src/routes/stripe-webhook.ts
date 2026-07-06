import { OrderStatus } from "@venuepass/common";
import express, { type Request, type Response } from "express";
import Stripe from "stripe";
import { PaymentClearedPublisher } from "../events/publishers/payment-cleared-publisher";
import { Order } from "../models/order.model";
import { Payment } from "../models/payment.model";
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

      const order = await Order.findById(orderId);

      if (!order) {
        return res.status(404).send("Order not found");
      }

      if (order.status === OrderStatus.COMPLETED) {
        return res.status(200).send({ received: true });
      }

      const payment = Payment.build({
        orderId: order.id,
        stripeId: paymentIntent.id,
      });
      await payment.save();
      await new PaymentClearedPublisher(natsClient.client).publish({
        orderId: order.id,
        stripeId: paymentIntent.id,
      });
    }

    res.status(200).send({ received: true });
  },
);

export { router as stripeWebhookRouter };
