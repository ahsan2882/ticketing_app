import {
  BadRequestError,
  requireAuth,
  validateRequest,
} from "@venuepass/common";
import { EventType, TicketCategory } from "@venuepass/common/client";
import express, { type Request, type Response } from "express";
import { body } from "express-validator";
import mongoose from "mongoose";
import { TicketCreatedPublisher } from "../events/publishers/ticket-created-publisher";
import { Ticket, type CreateTicketBodyIngress } from "../models/ticket.model";
import { natsClient } from "../nats-client";

const router = express.Router();

const MAX_TICKETS_PER_REQUEST = 50;

const createTicketValidators = [
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
    .isLength({ min: 3 })
    .withMessage("Artist must be at least 3 characters"),
  body("venue")
    .isString()
    .trim()
    .not()
    .isEmpty()
    .isLength({ min: 3 })
    .withMessage("Venue must be at least 3 characters"),
  body("city")
    .isString()
    .trim()
    .not()
    .isEmpty()
    .isLength({ min: 3 })
    .withMessage("City must be at least 3 characters"),
  body("eventDate")
    .isISO8601()
    .withMessage("Event date must be a valid date")
    .bail()
    .custom((value: string) => {
      const eventDate = new Date(value);

      if (eventDate.getTime() < Date.now()) {
        throw new Error("Event date cannot be in the past");
      }

      return true;
    })
    .toDate(),
  body("eventType")
    .isIn(Object.values(EventType))
    .withMessage("Invalid event type"),
  body("category")
    .isIn(Object.values(TicketCategory))
    .withMessage("Invalid ticket category"),
  body("seat")
    .not()
    .exists()
    .withMessage("Use seats as an array instead of seat"),
  body("seats")
    .optional()
    .isArray({ min: 1, max: MAX_TICKETS_PER_REQUEST })
    .withMessage(
      `seats must be a non-empty array of at most ${MAX_TICKETS_PER_REQUEST} entries if provided`,
    )
    .bail()
    .custom((seats: unknown[]) =>
      seats.every((s) => typeof s === "string" && s.trim().length > 0),
    )
    .withMessage("Each seat must be a non-empty string"),
  body("quantity")
    .optional()
    .isInt({ min: 1, max: MAX_TICKETS_PER_REQUEST })
    .withMessage(
      `quantity must be a positive integer no greater than ${MAX_TICKETS_PER_REQUEST}`,
    )
    .toInt(),
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
  body().custom((bodyVal) => {
    const { seats, quantity } = bodyVal;
    if (Array.isArray(seats) && seats.length > 0 && quantity !== undefined) {
      if (seats.length !== quantity) {
        throw new Error("quantity must match the number of seats provided");
      }
    }
    return true;
  }),
];

router.post(
  "/api/tickets",
  requireAuth,
  createTicketValidators,
  validateRequest,
  async (req: Request, res: Response) => {
    const {
      seats,
      quantity,
      eventDate: eventDateString,
      ...ticketAttrs
    }: CreateTicketBodyIngress = req.body;
    const parsedEventDate = new Date(eventDateString);
    const seatList: (string | undefined)[] =
      Array.isArray(seats) && seats.length > 0
        ? seats
        : Array.from({ length: quantity ?? 1 }, () => undefined);

    const session = await mongoose.startSession();
    let tickets: Awaited<ReturnType<typeof Ticket.build>>[] = [];

    try {
      await session.withTransaction(async () => {
        // Sequential, not Promise.all: all saves share one transaction,
        // so a failure partway through rolls back everything already
        // saved in this request rather than leaving a partial batch
        // committed. Sequential awaits inside a transaction are the
        // correct shape here — concurrent writes inside the same
        // session/transaction aren't safely parallelizable anyway.
        tickets = [];
        for (const seat of seatList) {
          const ticket = Ticket.build({
            title: ticketAttrs.title,
            price: ticketAttrs.price,
            artist: ticketAttrs.artist,
            venue: ticketAttrs.venue,
            city: ticketAttrs.city,
            eventDate: parsedEventDate,
            eventType: ticketAttrs.eventType,
            category: ticketAttrs.category,
            ...(seat !== undefined && { seat }),
            userId: req.currentUser!.id,
            description: ticketAttrs.description,
            imageUrl: ticketAttrs.imageUrl,
          });
          await ticket.save({ session });
          tickets.push(ticket);
        }
      });
    } catch (err: any) {
      // Schema-level Mongoose validation (e.g. eventDate must be in the
      // future, price min, title minLength) is a distinct layer from the
      // express-validator checks above — those only validate request-body
      // shape, not domain rules enforced at the schema level. Without this
      // catch, a ValidationError thrown inside the transaction propagates
      // as an unhandled 500 instead of the clean 400 a bad eventDate
      // should produce.
      if (err?.name === "ValidationError") {
        const messages = Object.values(err.errors as Record<string, any>).map(
          (e: any) => e.message,
        );
        throw new BadRequestError(messages.join(", "));
      }
      console.warn(err);
      throw err;
    } finally {
      await session.endSession();
    }

    await Promise.all(
      tickets.map((ticket) =>
        new TicketCreatedPublisher(natsClient.client).publish({
          id: ticket.id,
          title: ticket.title,
          price: ticket.price,
          userId: ticket.userId,
          status: ticket.status,
          version: ticket.version,
        }),
      ),
    );

    res.status(201).send(tickets);
  },
);

export { router as createTicketRouter };
