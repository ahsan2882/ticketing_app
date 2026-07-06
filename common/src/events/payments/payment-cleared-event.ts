import { SUBJECTS } from "../../models/event.model";

export interface PaymentClearedEvent {
  subject: SUBJECTS.PaymentCleared;
  data: {
    orderId: string;
    stripeId: string;
  };
}
