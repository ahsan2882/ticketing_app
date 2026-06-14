import { NotFoundError } from "@venuepass/common";
import express, { type Request, type Response } from "express";
import { Ticket } from "../models/ticket.model";

const router = express.Router();

router.get("/api/tickets", async (req: Request, res: Response) => {
  const tickets = await Ticket.find({});
  if (!tickets) {
    throw new NotFoundError();
  }
  res.send(tickets);
});

export { router as findAllTicketRouter };
