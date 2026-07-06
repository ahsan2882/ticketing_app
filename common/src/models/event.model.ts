export const STREAM_NAME = "EVENTS";

export enum SUBJECTS {
  ExpirationComplete = "expiration.complete",
  OrderAwaitingPayment = "order.awaiting-payment",
  OrderCreated = "order.created",
  OrderCancelled = "order.cancelled",
  OrderCompleted = "order.completed",
  PaymentCleared = "payment.cleared",
  TicketCreated = "ticket.created",
  TicketUpdated = "ticket.updated",
}

// TODO: Posion Queue Implementation
// export const DEAD_LETTER_SUBJECT_PREFIX = "dead-letter";

export interface Event<TData> {
  subject: SUBJECTS;
  data: TData;
}
