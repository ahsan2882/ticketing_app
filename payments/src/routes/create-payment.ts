import {
  BadRequestError,
  NotFoundError,
  OrderStatus,
  requireAuth,
  UnauthorizedError,
  validateRequest,
} from "@venuepass/common";
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
    const idempotencyKey = `payment-intent-order-${orderId}`;
    const paymentIntent = await stripe.paymentIntents.create(
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
    await Order.updateOne(
      { _id: orderId },
      { $set: { stripeId: paymentIntent.id } },
    );
    res.status(201).send({ clientSecret: paymentIntent.client_secret });
  },
);

export { router as createPaymentRouter };
