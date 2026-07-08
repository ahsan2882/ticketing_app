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
    const ticketId: string = req.body.ticketId;
    // Find the ticket the user is trying to order in the database
    const session = await mongoose.startSession();

    try {
      let order: ReturnType<typeof Order.build> | undefined;
      await session.withTransaction(async () => {
        const ticket = await Ticket.findById(ticketId).session(session);
        if (!ticket) {
          throw new NotFoundError("Ticket not found");
        }
        // Make sure the ticket is not already reserved
        const isReserved = await ticket.isReserved(session);
        if (isReserved) {
          throw new BadRequestError("Ticket is already reserved");
        }
        // Build the order and save it to the database
        order = Order.build({
          userId: req.currentUser!.id,
          status: OrderStatus.CREATED,
          ticket,
        });
        await order.save({ session });
      });
      // Publish an event saying the order was created
      await new OrderCreatedPublisher(natsClient.client).publish({
        id: order!.id,
        status: order!.status,
        userId: order!.userId,
        version: order!.version,
        expiresAt: order!.expiresAt.toISOString(),
        ticket: {
          id: order!.ticket.id,
          price: order!.ticket.price,
        },
      });

      res.status(201).send(order!);
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new BadRequestError("Ticket is already reserved");
      }
      throw error;
    } finally {
      await session.endSession();
    }
  },
);

export { router as createOrderRouter };
