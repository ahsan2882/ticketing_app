import { SUBJECTS } from "../../models/event.model";
import { OrderStatus } from "../../models/order.model";

export interface OrderCancelledEvent {
  subject: SUBJECTS.OrderCancelled;
  data: {
    id: string;
    version: number;
    status: OrderStatus;
    ticket: { id: string };
  };
}
