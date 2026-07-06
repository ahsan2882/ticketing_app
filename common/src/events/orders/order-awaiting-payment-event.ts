import { SUBJECTS } from "../../models/event.model";
import { OrderStatus } from "../../models/order.model";

export interface OrderAwaitingPaymentEvent {
  subject: SUBJECTS.OrderAwaitingPayment;
  data: {
    id: string;
    userId: string;
    status: OrderStatus;
    version: number;
    ticket: { id: string; price: number };
  };
}
