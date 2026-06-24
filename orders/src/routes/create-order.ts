import {
  BadRequestError,
  NotFoundError,
  OrderStatus,
  requireAuth,
  validateRequest,
} from "@venuepass/common";
import express, { type Request, type Response } from "express";
import { body } from "express-validator";
import mongoose from "mongoose";
import { OrderCreatedPublisher } from "../events/publishers/order-created-publisher";
import { Order } from "../models/order.model";
import { Ticket } from "../models/ticket.model";
import { natsClient } from "../nats-client";

const router = express.Router();

const createOrderValidators = [
  body("ticketId")
    .notEmpty()
    .withMessage("ticketId is required")
    .bail()
    .custom((val: string) => mongoose.Types.ObjectId.isValid(val))
    .withMessage("ticketId must be a valid Mongo ObjectId"),
];

router.post(
  "/api/orders",
  requireAuth,
  createOrderValidators,
  validateRequest,
  async (req: Request, res: Response) => {
    const { ticketId } = req.body;
    // Find the ticket the user is trying to order in the database
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError();
    }
    // Make sure the ticket is not already reserved
    const isReserved = await ticket.isReserved();
    if (isReserved) {
      throw new BadRequestError("Ticket is already reserved");
    }
    // Build the order and save it to the database

    const order = Order.build({
      userId: req.currentUser!.id,
      status: OrderStatus.CREATED,
      ticket,
    });
    await order.save();
    // Publish an event saying the order was created
    await new OrderCreatedPublisher(natsClient.client).publish({
      id: order.id,
      status: order.status,
      userId: order.userId,
      version: 0,
      expiresAt: order.expiresAt.toISOString(),
      ticket: {
        id: ticket.id,
        price: ticket.price,
      },
    });

    res.status(201).send(order);
  },
);

export { router as createOrderRouter };
