import { requireAuth } from "@venuepass/common";
import express, { type Request, type Response } from "express";
import { Order } from "../models/order.model";

const router = express.Router();

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const parseIntegerQueryParam = (value: unknown) => {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
};

router.get("/api/orders", requireAuth, async (req: Request, res: Response) => {
  const requestedLimit = parseIntegerQueryParam(req.query.limit);
  const limit =
    requestedLimit !== undefined && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  const skip = parseIntegerQueryParam(req.query.skip) ?? 0;

  const orders = await Order.find({ userId: req.currentUser!.id })
    .sort({ createdAt: -1 }) // newest first; without this, Mongo's return order is not guaranteed
    .skip(skip)
    .limit(limit)
    .populate("ticket");

  res.send(orders);
});

export { router as findAllOrdersRouter };
