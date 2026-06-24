import { SUBJECTS } from "../../models/event.model";

export interface OrderCancelledEvent {
  subject: SUBJECTS.OrderCancelled;
  data: {
    id: string;
    version: number;
    ticket: { id: string };
  };
}
