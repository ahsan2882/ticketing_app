import {
  EventType,
  requireAuth,
  TicketCategory,
  TicketStatus,
  validateRequest,
} from "@venuepass/common";
import express, { type Request, type Response } from "express";
import { body } from "express-validator";
import { TicketCreatedPublisher } from "../events/publishers/ticket-created-publisher";
import { Ticket } from "../models/ticket.model";
import { natsClient } from "../nats-client";

const router = express.Router();

router.post(
  "/api/tickets",
  requireAuth,
  [
    body("title")
      .isString()
      .trim()
      .not()
      .isEmpty()
      .isLength({ min: 3 })
      .withMessage("Title is required, must be atleast 3 characters"),
    body("price")
      .not()
      .isEmpty()
      .isFloat({ gt: 0 })
      .withMessage("Price is required, must be greater than 0"),
    body("artist")
      .isString()
      .trim()
      .not()
      .isEmpty()
      .withMessage("Artist must be a string"),
    body("venue")
      .isString()
      .trim()
      .not()
      .isEmpty()
      .withMessage("Venue must be a string"),
    body("city")
      .isString()
      .trim()
      .not()
      .isEmpty()
      .withMessage("City must be a string"),
    body("eventDate")
      .isISO8601({ strict: true, strictSeparator: true })
      .toDate()
      .withMessage("Event date must be a valid date"),
    body("eventType")
      .isIn(Object.values(EventType))
      .withMessage("Invalid event type"),
    body("category")
      .isIn(Object.values(TicketCategory))
      .withMessage("Invalid ticket category"),
    body("seat")
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
  ],
  validateRequest,
  async (req: Request, res: Response) => {
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
    } = req.body;
    const ticket = Ticket.build({
      title,
      price,
      userId: req.currentUser!.id,
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
    });
    await ticket.save();
    await new TicketCreatedPublisher(natsClient.client).publish({
      id: ticket.id,
      title: ticket.title,
      price: ticket.price,
      userId: ticket.userId,
      version: ticket.version,
      status: TicketStatus.AVAILABLE,
    });
    res.status(201).send(ticket);
  },
);

export { router as createTicketRouter };
