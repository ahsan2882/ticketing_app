import { OrderStatus } from "@venuepass/common";
import mongoose from "mongoose";

interface OrderAttrs {
  id: string;
  userId: string;
  price: number;
  status: OrderStatus;
}

interface OrderDoc extends mongoose.Document {
  id: string;
  version: number;
  userId: string;
  price: number;
  status: OrderStatus;
}

interface OrderModel extends mongoose.Model<OrderDoc> {
  build(attrs: OrderAttrs): OrderDoc;
}

const orderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      required: true,
    },
  },
  {
    optimisticConcurrency: true,
    toJSON: {
      transform(doc, ret) {
        const { _id, userId, price, status } = ret;
        return {
          id: _id.toString(),
          userId,
          price,
          status,
          version: doc.get("version"),
        };
      },
    },
    versionKey: "version",
  },
);

orderSchema.statics.build = (attrs: OrderAttrs) => {
  const { id, ...otherFields } = attrs;
  return new Order({ _id: attrs.id, ...otherFields });
};

const Order = mongoose.model<OrderDoc, OrderModel>("Order", orderSchema);

export { Order };
