import mongoose from "mongoose";
import { Order, OrderStatus } from "./order.model";

interface TicketAttrs {
  id: string;
  title: string;
  price: number;
  userId: string;
  orderId?: string;
}

interface TicketDoc extends mongoose.Document {
  id: string;
  title: string;
  price: number;
  userId: string;
  version: number;
  orderId?: string;
  isReserved(session?: mongoose.ClientSession): Promise<boolean>;
}

interface TicketModel extends mongoose.Model<TicketDoc> {
  build(atts: TicketAttrs): TicketDoc;
}

const ticketSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    userId: { type: String, required: true },
    orderId: { type: String },
  },
  {
    optimisticConcurrency: true,
    toJSON: {
      transform(doc, ret) {
        const { _id, title, price, userId } = ret;
        return {
          id: _id.toString(),
          title,
          price,
          userId,
          version: doc.get("version"),
        };
      },
    },
    versionKey: "version",
  },
);

ticketSchema.statics.build = (attrs: TicketAttrs) => {
  const { id, ...otherFields } = attrs;
  return new Ticket({
    _id: attrs.id,
    ...otherFields,
  });
};

ticketSchema.methods.isReserved = async function (
  session?: mongoose.ClientSession,
) {
  const existingOrder = await Order.findOne({
    ticket: this,
    status: {
      $in: [
        OrderStatus.CREATED,
        OrderStatus.AWAITING_PAYMENT,
        OrderStatus.COMPLETED,
      ],
    },
  }).session(session ?? null);
  return !!existingOrder;
};

const Ticket = mongoose.model<TicketDoc, TicketModel>("Ticket", ticketSchema);

export { Ticket, type TicketAttrs, type TicketDoc };
