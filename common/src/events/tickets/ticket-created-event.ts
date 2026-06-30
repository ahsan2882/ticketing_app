import { SUBJECTS } from "../../models/event.model";
import type { TicketStatus } from "../../models/ticket.model";

export interface TicketCreatedEvent {
  subject: SUBJECTS.TicketCreated;
  data: {
    id: string;
    title: string;
    price: number;
    userId: string;
    status: TicketStatus;
    version: number;
  };
}
