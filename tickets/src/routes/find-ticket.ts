import { BadRequestError, NotFoundError } from "@venuepass/common";
import express, { type Request, type Response } from "express";
import mongoose from "mongoose";
import { Ticket } from "../models/ticket.model";

const router = express.Router();

const PUBLIC_FIELDS =
  "title price artist venue city eventDate eventType category status description imageUrl";
const PRIVATE_FIELDS = `${PUBLIC_FIELDS} userId seat`;

router.get("/api/tickets/:id", async (req: Request, res: Response) => {
  const ticketId = req.params.id;
  if (
    ticketId === undefined ||
    Array.isArray(ticketId) ||
    !mongoose.Types.ObjectId.isValid(ticketId)
  ) {
    throw new BadRequestError("Invalid ID");
  }
  const fields = req.currentUser ? PRIVATE_FIELDS : PUBLIC_FIELDS;
  const ticket = await Ticket.findById(ticketId).select(fields);
  if (!ticket) {
    throw new NotFoundError("Ticket not found");
  }
  res.send(ticket);
});

export { router as findTicketRouter };
