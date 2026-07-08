import { SUBJECTS } from "../../models/event.model";

export interface PaymentRefundEvent {
  subject: SUBJECTS.PaymentRefund;
  data: {
    orderId: string;
    stripeId: string;
  };
}
