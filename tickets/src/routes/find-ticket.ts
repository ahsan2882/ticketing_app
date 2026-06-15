import { NotFoundError } from "@venuepass/common";
import express, { type Request, type Response } from "express";
import { Ticket, type TicketDoc } from "../models/ticket.model";
import mongoose from "mongoose";

const router = express.Router();

const PUBLIC_FIELDS =
  "title price artist venue city eventDate eventType category quantity status description imageUrl";
const PRIVATE_FIELDS = `${PUBLIC_FIELDS} userId seat`;

router.get("/api/tickets/:id", async (req: Request, res: Response) => {
  if (
    typeof req.params.id === "string" &&
    !mongoose.Types.ObjectId.isValid(req.params.id)
  ) {
    throw new NotFoundError();
  }
  const fields = req.currentUser ? PRIVATE_FIELDS : PUBLIC_FIELDS;
  const ticket = await Ticket.findById(req.params.id).select(fields);
  if (!ticket) {
    throw new NotFoundError();
  }
  res.send(ticket);
});

export { router as findTicketRouter };
