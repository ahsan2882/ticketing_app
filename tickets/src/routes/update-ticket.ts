import {
  NotFoundError,
  requireAuth,
  UnauthorizedError,
  validateRequest,
} from "@venuepass/common";
import express, { type Request, type Response } from "express";
import { body } from "express-validator";
import { Ticket, type TicketDoc } from "../models/ticket.model";
import mongoose from "mongoose";

const router = express.Router();

router.patch(
  "/api/tickets/:id",
  requireAuth,
  [
    body("title")
      .optional()
      .isLength({ min: 3 })
      .withMessage("Title must be atleast 3 characters"),
    body("price")
      .optional()
      .isFloat({ gt: 0 })
      .withMessage("Price must be greater than 0"),
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
    ticket.set({ ...req.body });
    await ticket.save();
    res.status(200).send(ticket);
  },
);

export { router as updateTicketRouter };
