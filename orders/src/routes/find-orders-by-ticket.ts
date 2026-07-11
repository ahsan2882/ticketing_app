import {
  BadRequestError,
  NotFoundError,
  requireAuth,
  UnauthorizedError,
} from "@venuepass/common";
import { OrderStatus } from "@venuepass/common/client";
import express, { type Request, type Response } from "express";
import mongoose from "mongoose";
import { Order } from "../models/order.model";
import type { TicketDoc } from "../models/ticket.model";

const router = express.Router();

router.get(
  "/api/orders/by-ticket/:ticketId",
  requireAuth,
  async (req: Request, res: Response) => {
    const { ticketId } = req.params;
    if (
      ticketId === undefined ||
      Array.isArray(ticketId) ||
      !mongoose.Types.ObjectId.isValid(ticketId)
    ) {
      throw new BadRequestError("Invalid ID");
    }

    const order = await Order.findOne({
      ticket: ticketId,
      status: { $ne: OrderStatus.CANCELLED },
    }).populate("ticket");

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    const ticket = order.ticket as unknown as TicketDoc;
    const isSeller = ticket.userId === req.currentUser!.id;

    if (!isSeller) {
      throw new UnauthorizedError();
    }

    res.send(order);
  },
);

export { router as findOrdersByTicketRouter };
