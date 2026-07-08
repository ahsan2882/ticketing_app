import {
  BadRequestError,
  NotFoundError,
  OrderStatus,
  requireAuth,
  UnauthorizedError,
} from "@venuepass/common";
import express, { type Request, type Response } from "express";
import mongoose from "mongoose";
import { OrderCancelledPublisher } from "../events/publishers/order-cancelled-publisher";
import { Order } from "../models/order.model";
import { natsClient } from "../nats-client";

const router = express.Router();

router.delete(
  "/api/orders/:orderId",
  requireAuth,
  async (req: Request, res: Response) => {
    const { orderId } = req.params;
    if (
      orderId === undefined ||
      Array.isArray(orderId) ||
      !mongoose.Types.ObjectId.isValid(orderId)
    ) {
      throw new BadRequestError("Invalid ID");
    }
    const order = await Order.findById(orderId).populate("ticket");
    if (!order) {
      throw new NotFoundError("Order not found");
    }
    if (order.userId !== req.currentUser!.id) {
      throw new UnauthorizedError();
    }
    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestError("Order is in a terminal state and cannot be cancelled");
    }
    order.set({ status: OrderStatus.CANCELLED });
    try {
      await order.save();
    } catch (error: any) {
      // optimisticConcurrency: true throws VersionError (err.name) when
      // the order was modified by another request between our findById
      // and this save — e.g. a double-cancel race, or a concurrent
      // ticket-update side effect touching this same order. Translate
      // into a clean 4xx instead of letting it surface as a 500; the
      // request didn't fail for a server reason, it lost a race.
      // NOTE: swap BadRequestError below for a ConflictError (409) if
      // @venuepass/common exposes one — this is a 409-shaped situation,
      // not really a 400.
      if (error?.name === "VersionError") {
        throw new BadRequestError(
          "Order was modified concurrently, please retry",
        );
      }
      throw error;
    }
    await new OrderCancelledPublisher(natsClient.client).publish({
      id: order.id,
      version: order.version,
      ticket: { id: order.ticket.id },
      status: OrderStatus.CANCELLED,
    });
    // return the order that was just cancelled to the user so they can see it in their orders list
    // we don't want to send back the ticket details because they shouldn't be able to see them after cancelling an order
    const { ticket, ...strippedOrder } = order;
    res.status(200).send(strippedOrder);
  },
);
export { router as cancelOrderRouter };
