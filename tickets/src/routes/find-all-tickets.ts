import { NotFoundError } from "@venuepass/common";
import express, { type Request, type Response } from "express";
import { Ticket } from "../models/ticket.model";

const router = express.Router();

const PUBLIC_FIELDS =
  "title price artist venue city eventDate eventType category quantity status description imageUrl";
const PRIVATE_FIELDS = `${PUBLIC_FIELDS} userId seat`;

router.get("/api/tickets", async (req: Request, res: Response) => {
  const fields = req.currentUser ? PRIVATE_FIELDS : PUBLIC_FIELDS;
  const tickets = await Ticket.find(
    !!req.currentUser ? {} : { status: "available" },
  ).select(fields);
  if (!tickets) {
    throw new NotFoundError();
  }
  res.send(tickets);
});

export { router as findAllTicketRouter };
