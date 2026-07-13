import {
  EventType,
  TicketCategory,
  TicketStatus,
} from "@venuepass/common/client";
import { toTitleCase } from "../lib/utils/utils";

export const EVENT_TYPES = Object.values(EventType).map((e) => {
  return { label: toTitleCase(e), value: e };
});

export const TICKET_CATEGORIES = Object.values(TicketCategory).map((e) => {
  return { label: toTitleCase(e), value: e };
});

export interface TicketModel {
  artist: string;
  category: TicketCategory;
  city: string;
  eventDate: string;
  eventType: EventType;
  id: string;
  price: number;
  status: TicketStatus;
  title: string;
  userId: string;
  venue: string;
  description?: string;
  imageUrl?: string;
  seat?: string;
}

export const CATEGORY_STYLES = {
  [EventType.Concert]: {
    border: "border-l-purple-500",
    chip: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  },
  [EventType.Sports]: {
    border: "border-l-emerald-500",
    chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  [EventType.Theatre]: {
    border: "border-l-orange-500",
    chip: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  },
  [EventType.Comedy]: {
    border: "border-l-blue-500",
    chip: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  },
  [EventType.Festival]: {
    border: "border-l-pink-500",
    chip: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  },
  [EventType.Conference]: {
    border: "border-l-indigo-500",
    chip: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  },
};
