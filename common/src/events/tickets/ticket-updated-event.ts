import { SUBJECTS } from "../../models/event.model";
import type { TicketStatus } from "../../models/ticket.model";

export interface TicketUpdatedEvent {
  subject: SUBJECTS.TicketUpdated;
  data: {
    id: string;
    title: string;
    price: number;
    userId: string;
    status: TicketStatus;
    version: number;
  };
}
