import type {
  EventType,
  TicketCategory,
  TicketStatus,
} from "@venuepass/common";
import mongoose from "mongoose";

interface TicketAttrs {
  title: string;
  price: number;
  userId: string;
  artist: string;
  venue: string;
  city: string;
  eventDate: Date;
  eventType: EventType;
  category: TicketCategory;
  seat: string;
  quantity?: number;
  description?: string;
  imageUrl?: string;
  status?: TicketStatus;
}

interface TicketModel extends mongoose.Model<TicketDoc> {
  build(attrs: TicketAttrs): TicketDoc;
}

interface TicketDoc extends mongoose.Document {
  id: string;
  title: string;
  price: number;
  userId: string;
  artist: string;
  venue: string;
  city: string;
  eventDate: Date;
  eventType: EventType;
  category: TicketCategory;
  seat: string;
  quantity?: number;
  description?: string;
  imageUrl?: string;
  status: TicketStatus;
}

const ticketSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minLength: 3,
    },
    price: {
      type: Number,
      required: true,
      min: 0.01,
    },
    userId: {
      type: String,
      required: true,
      immutable: true,
    },
    artist: {
      type: String,
      trim: true,
      required: true,
    },
    venue: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
      required: true,
    },
    eventDate: {
      type: Date,
      required: true,
    },
    eventType: {
      type: String,
      enum: [
        "concert",
        "sports",
        "theatre",
        "comedy",
        "festival",
        "conference",
      ],
      required: true,
    },
    category: {
      type: String,
      enum: ["standard", "VIP", "floor", "balcony", "box"],
      required: true,
    },
    seat: {
      type: String,
      trim: true,
      required: true,
    },
    quantity: {
      type: Number,
      min: 1,
      default: 1,
    },
    description: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["available", "sold", "reserved", "cancelled"],
      default: "available",
    },
  },
  {
    toJSON: {
      transform(_doc, ret) {
        const {
          _id,
          title,
          price,
          userId,
          artist,
          venue,
          city,
          eventDate,
          eventType,
          category,
          seat,
          quantity,
          description,
          imageUrl,
          status,
        } = ret;
        return {
          id: _id,
          title,
          price,
          userId,
          artist,
          venue,
          city,
          eventDate,
          eventType,
          category,
          seat,
          quantity,
          description,
          imageUrl,
          status,
        };
      },
    },
    versionKey: false,
  },
);

ticketSchema.statics.build = (attrs: TicketAttrs) => {
  return new Ticket(attrs);
};

const Ticket = mongoose.model<TicketDoc, TicketModel>("Ticket", ticketSchema);

export { Ticket, type TicketDoc };
