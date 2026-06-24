import {
  BadRequestError,
  NotFoundError,
  requireAuth,
  UnauthorizedError,
} from "@venuepass/common";
import express, { type Request, type Response } from "express";
import mongoose from "mongoose";
import { Order } from "../models/order.model";

const router = express.Router();

router.get(
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
    res.send(order);
  },
);

export { router as findOrderRouter };
