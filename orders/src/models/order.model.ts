import { OrderStatus } from "@venuepass/common";
import mongoose from "mongoose";
import { type TicketDoc } from "../models/ticket.model";

const EXPIRATION_WINDOW_SECONDS = 15 * 60; // 15 minutes

interface OrderAttrs {
  userId: string;
  ticket: TicketDoc;
  status: OrderStatus;
  expiresAt?: Date;
}

interface OrderModel extends mongoose.Model<OrderDoc> {
  build(attrs: OrderAttrs): OrderDoc;
}

interface OrderDoc extends mongoose.Document {
  id: string;
  userId: string;
  ticket: TicketDoc;
  status: OrderStatus;
  expiresAt: Date;
  version: number;
}

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      immutable: true,
    },
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
      immutable: true,
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.CREATED,
    },
    expiresAt: {
      type: mongoose.Schema.Types.Date,
      required: true,
    },
  },
  {
    optimisticConcurrency: true,
    toJSON: {
      transform(_doc, ret) {
        const { _id, userId, ticket, status, expiresAt, __v } = ret;
        return {
          id: _id,
          userId,
          ticket,
          status,
          expiresAt,
          version: __v,
        };
      },
    },
    versionKey: "version",
  },
);

orderSchema.statics.build = (attrs: OrderAttrs) => {
  return new Order({
    ...attrs,
    expiresAt:
      attrs.expiresAt ??
      new Date(Date.now() + EXPIRATION_WINDOW_SECONDS * 1000),
  });
};

const Order = mongoose.model<OrderDoc, OrderModel>("Order", orderSchema);

export { Order, OrderStatus, type OrderDoc };
