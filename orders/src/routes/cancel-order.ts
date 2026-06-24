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
    if (orderId === undefined || Array.isArray(orderId)) {
      throw new BadRequestError("Invalid ID");
    }
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new NotFoundError();
    }
    const order = await Order.findById(orderId).populate("ticket");
    if (!order) {
      throw new NotFoundError();
    }
    if (order.userId !== req.currentUser!.id) {
      throw new UnauthorizedError();
    }
    order.status = OrderStatus.CANCELLED;
    await order.save();
    await new OrderCancelledPublisher(natsClient.client).publish({
      id: order.id,
      version: 0,
      ticket: { id: order.ticket.id },
    });
    // return the order that was just cancelled to the user so they can see it in their orders list
    // we don't want to send back the ticket details because they shouldn't be able to see them after cancelling an order
    res.status(200).send(order);
  },
);
export { router as cancelOrderRouter };
