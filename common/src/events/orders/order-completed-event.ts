import { SUBJECTS } from "../../models/event.model";
import { OrderStatus } from "../../models/order.model";

export interface OrderCompletedEvent {
  subject: SUBJECTS.OrderCompleted;
  data: {
    id: string;
    version: number;
    status: OrderStatus;
  };
}
