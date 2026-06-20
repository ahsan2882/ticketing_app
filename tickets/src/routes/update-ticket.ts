import {
  NotFoundError,
  requireAuth,
  UnauthorizedError,
  validateRequest,
} from "@venuepass/common";
import express, { type Request, type Response } from "express";
import { body } from "express-validator";
import mongoose from "mongoose";
import { TicketUpdatedPublisher } from "../events/publishers/ticket-updated-publisher";
import { Ticket, type TicketDoc } from "../models/ticket.model";
import { natsClient } from "../nats-client";

const router = express.Router();

router.patch(
  "/api/tickets/:id",
  requireAuth,
  [
    body("title")
      .optional()
      .isString()
      .trim()
      .not()
      .isEmpty()
      .isLength({ min: 3 })
      .withMessage("Title must be atleast 3 characters"),
    body("price")
      .optional()
      .isFloat({ gt: 0 })
      .withMessage("Price must be greater than 0"),
    body("artist")
      .optional()
      .isString()
      .trim()
      .not()
      .isEmpty()
      .withMessage("Artist must be a string"),
    body("venue")
      .optional()
      .isString()
      .trim()
      .not()
      .isEmpty()
      .withMessage("Venue must be a string"),
    body("city")
      .optional()
      .isString()
      .trim()
      .not()
      .isEmpty()
      .withMessage("City must be a string"),
    body("eventDate")
      .optional()
      .isISO8601({ strict: true, strictSeparator: true })
      .toDate()
      .withMessage("Event date must be a valid date"),
    body("eventType")
      .optional()
      .isIn([
        "concert",
        "sports",
        "theatre",
        "comedy",
        "festival",
        "conference",
      ])
      .withMessage("Invalid event type"),
    body("category")
      .optional()
      .isIn(["standard", "VIP", "floor", "balcony", "box"])
      .withMessage("Invalid ticket category"),
    body("seat")
      .optional()
      .isString()
      .trim()
      .not()
      .isEmpty()
      .withMessage("Seat must be a string"),
    body("quantity")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Quantity must be a positive integer"),
    body("description")
      .optional()
      .isString()
      .trim()
      .not()
      .isEmpty()
      .withMessage("Description must be a string"),
    body("imageUrl")
      .optional()
      .isURL()
      .withMessage("Image URL must be a valid URL"),
    body("status")
      .optional()
      .isIn(["available", "sold", "reserved", "cancelled"])
      .withMessage("Invalid status"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    if (
      typeof req.params.id === "string" &&
      !mongoose.Types.ObjectId.isValid(req.params.id)
    ) {
      throw new NotFoundError();
    }
    const ticket: TicketDoc | null = await Ticket.findById(req.params.id);
    if (!ticket) {
      throw new NotFoundError();
    }
    if (ticket.userId !== req.currentUser?.id) {
      throw new UnauthorizedError();
    }
    const {
      title,
      price,
      artist,
      venue,
      city,
      eventDate,
      eventType,
      category,
      seat,
      quantity,
      description,
      imageUrl,
      status,
    } = req.body;
    ticket.set({
      ...(title !== undefined && { title }),
      ...(price !== undefined && { price }),
      ...(artist !== undefined && { artist }),
      ...(venue !== undefined && { venue }),
      ...(city !== undefined && { city }),
      ...(eventDate !== undefined && { eventDate }),
      ...(eventType !== undefined && { eventType }),
      ...(category !== undefined && { category }),
      ...(seat !== undefined && { seat }),
      ...(quantity !== undefined && { quantity }),
      ...(description !== undefined && { description }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(status !== undefined && { status }),
    });
    await ticket.save();
    await new TicketUpdatedPublisher(natsClient.client).publish({
      id: ticket.id,
      userId: ticket.userId,
      ...(title !== undefined && { title: ticket.title }),
      ...(price !== undefined && { price: ticket.price }),
      ...(artist !== undefined && { artist: ticket.artist }),
      ...(venue !== undefined && { venue: ticket.venue }),
      ...(city !== undefined && { city: ticket.city }),
      ...(eventDate !== undefined && { eventDate: ticket.eventDate }),
      ...(eventType !== undefined && { eventType: ticket.eventType }),
      ...(category !== undefined && { category: ticket.category }),
      ...(seat !== undefined && { seat: ticket.seat }),
      ...(quantity !== undefined && { quantity: ticket.quantity }),
      ...(description !== undefined && { description: ticket.description }),
      ...(imageUrl !== undefined && { imageUrl: ticket.imageUrl }),
      ...(status !== undefined && { status: ticket.status }),
    });
    res.status(200).send(ticket);
  },
);

export { router as updateTicketRouter };
