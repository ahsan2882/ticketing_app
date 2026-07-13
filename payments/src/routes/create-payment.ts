import {
  BadRequestError,
  NotFoundError,
  requireAuth,
  UnauthorizedError,
  validateRequest,
} from "@venuepass/common";
import { OrderStatus } from "@venuepass/common/client";
import express, { type Request, type Response } from "express";
import { body } from "express-validator";
import mongoose from "mongoose";
import { Order } from "../models/order.model";
import { stripe } from "../stripe";

const router = express.Router();

router.post(
  "/api/payments",
  requireAuth,
  [
    body("orderId")
      .isString()
      .not()
      .isEmpty()
      .custom((val: string) => mongoose.Types.ObjectId.isValid(val))
      .withMessage("Order ID must not be empty"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);
    if (!order) {
      throw new NotFoundError("Order not found");
    }

    if (order.userId !== req.currentUser!.id) {
      throw new UnauthorizedError();
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestError("Order has already been cancelled");
    }
    if (order.status === OrderStatus.COMPLETED) {
      throw new BadRequestError("Order has already been paid");
    }
    if (order.stripeId) {
      const existingIntent = await stripe.paymentIntents.retrieve(
        order.stripeId,
      );
      if (
        existingIntent.status !== "canceled" &&
        existingIntent.status !== "succeeded"
      ) {
        res.status(201).send({ clientSecret: existingIntent.client_secret });
        return;
      }
    }
    // Generate an idempotency key that includes the current order version.
    // This ensures retries of the same attempt reuse the same key,
    // while new attempts get distinct keys to prevent replaying old responses.
    const idempotencyKey = `payment-intent-order-${orderId}-v${order.version}`;

    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create(
        {
          amount: Math.round(order.price * 100),
          currency: "usd",
          payment_method_types: ["card"],
          description: `Payment for order ${orderId}`,
          metadata: {
            orderId,
            userId: req.currentUser!.id,
          },
        },
        { idempotencyKey },
      );
    } catch (error: any) {
      // If Stripe reports this paymentIntent was already created with this key,
      // return the cached response to handle retries within the same attempt.
      if (
        error?.type === "api_error" &&
        error.rawType === "idempotency_error"
      ) {
        const existingIntent = await stripe.paymentIntents.retrieve(
          error.raw.id,
        );
        if (
          existingIntent.status !== "canceled" &&
          existingIntent.status !== "succeeded"
        ) {
          res.status(201).send({ clientSecret: existingIntent.client_secret });
          return;
        }
      }
      throw error;
    }
    await Order.updateOne(
      { _id: orderId },
      { $set: { stripeId: paymentIntent.id } },
    );
    res.status(201).send({ clientSecret: paymentIntent.client_secret });
  },
);

export { router as createPaymentRouter };
