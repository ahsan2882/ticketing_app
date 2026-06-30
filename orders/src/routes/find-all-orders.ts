import { requireAuth } from "@venuepass/common";
import express, { type Request, type Response } from "express";
import { Order } from "../models/order.model";

const router = express.Router();

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

router.get("/api/orders", requireAuth, async (req: Request, res: Response) => {
  const requestedLimit = Number(req.query.limit);
  const limit =
    Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  const requestedSkip = Number(req.query.skip);
  const skip =
    Number.isFinite(requestedSkip) && requestedSkip >= 0 ? requestedSkip : 0;

  const orders = await Order.find({ userId: req.currentUser!.id })
    .sort({ createdAt: -1 }) // newest first; without this, Mongo's return order is not guaranteed
    .skip(skip)
    .limit(limit)
    .populate("ticket");

  res.send(orders);
});

export { router as findAllOrdersRouter };
