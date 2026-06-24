import { SUBJECTS } from "../../models/event.model";
import { OrderStatus } from "../../models/order.model";

export interface OrderCreatedEvent {
  subject: SUBJECTS.OrderCreated;
  data: {
    id: string;
    userId: string;
    status: OrderStatus;
    expiresAt: string;
    version: number;
    ticket: { id: string; price: number };
  };
}
