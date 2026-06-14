import { NotFoundError } from "@venuepass/common";
import express, { type Request, type Response } from "express";
import { Ticket } from "../models/ticket.model";
import mongoose from "mongoose";

const router = express.Router();

router.get("/api/tickets/:id", async (req: Request, res: Response) => {
  if (
    typeof req.params.id === "string" &&
    !mongoose.Types.ObjectId.isValid(req.params.id)
  ) {
    throw new NotFoundError();
  }
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    throw new NotFoundError();
  }
  res.send(ticket);
});

export { router as findTicketRouter };
