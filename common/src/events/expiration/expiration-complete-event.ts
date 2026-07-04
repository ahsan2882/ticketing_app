import { SUBJECTS } from "../../models/event.model";

export interface ExpirationCompleteEvent {
  subject: SUBJECTS.ExpirationComplete;
  data: { orderId: string };
}
