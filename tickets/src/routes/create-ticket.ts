import { requireAuth, validateRequest } from "@venuepass/common";
import express, { type Request, type Response } from "express";
import { body } from "express-validator";
import { Ticket } from "../models/ticket.model";

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
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { title, price } = req.body;
    const ticket = Ticket.build({ title, price, userId: req.currentUser!.id });
    await ticket.save();
    res.status(201).send(ticket);
  },
);

export { router as createTicketRouter };
