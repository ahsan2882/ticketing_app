import { TicketStatus } from "@venuepass/common";
import express, { type Request, type Response } from "express";
import { Ticket } from "../models/ticket.model";

const router = express.Router();

const PUBLIC_FIELDS =
  "title price artist venue city eventDate eventType category status description imageUrl";
const PRIVATE_FIELDS = `${PUBLIC_FIELDS} userId seat`;

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

router.get("/api/tickets", async (req: Request, res: Response) => {
  const fields = req.currentUser ? PRIVATE_FIELDS : PUBLIC_FIELDS;
  const requestedLimit = Number(req.query.limit);
  const limit =
    Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  const requestedSkip = Number(req.query.skip);
  const skip =
    Number.isFinite(requestedSkip) && requestedSkip >= 0 ? requestedSkip : 0;
  const tickets = await Ticket.find(
    !!req.currentUser ? {} : { status: TicketStatus.AVAILABLE },
  )
    .select(fields)
    .sort({ eventDate: 1 }) // soonest events first — without this, Mongo's
    // return order is not guaranteed; eventDate is the natural sort for a
    // ticket marketplace listing, unlike find-all-orders where createdAt
    // (newest first) made more sense
    .skip(skip)
    .limit(limit);

  res.send(tickets);
});

export { router as findAllTicketRouter };
