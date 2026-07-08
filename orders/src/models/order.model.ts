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
  createdAt: Date;
  expiresAt: Date;
  version: number;
  completedEventSent: boolean;
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
    completedEventSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    optimisticConcurrency: true,
    toJSON: {
      transform(doc: OrderDoc, ret: Record<string, any>) {
        const { _id, userId, ticket, status, expiresAt, createdAt } = ret;
        return {
          id: _id.toString(),
          userId,
          ticket,
          status,
          expiresAt,
          createdAt,
          version: doc.get("version"),
        };
      },
    },
    versionKey: "version",
  },
);

orderSchema.index(
  { ticket: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: [
          OrderStatus.CREATED,
          OrderStatus.AWAITING_PAYMENT,
          OrderStatus.COMPLETED,
        ],
      },
    },
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
