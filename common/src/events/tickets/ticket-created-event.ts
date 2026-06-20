import { SUBJECTS } from "../../models/event.model";
import type {
  EventType,
  TicketCategory,
  TicketStatus,
} from "../../models/ticket.model";

export interface TicketCreatedEvent {
  subject: SUBJECTS.TicketCreated;
  data: {
    id: string;
    title: string;
    price: number;
    userId: string;
    artist: string;
    venue: string;
    city: string;
    eventDate: string;
    eventType: EventType;
    category: TicketCategory;
    seat: string;
    quantity?: number;
    description?: string;
    imageUrl?: string;
    status?: TicketStatus;
  };
}
