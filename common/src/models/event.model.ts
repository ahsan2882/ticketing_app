export const STREAM_NAME = "EVENTS";

export enum SUBJECTS {
  TicketCreated = "ticket.created",
  TicketUpdated = "ticket.updated",
  OrderCreated = "order.created",
  OrderCancelled = "order.cancelled",
}

// TODO: Posion Queue Implementation
// export const DEAD_LETTER_SUBJECT_PREFIX = "dead-letter";

export interface Event<TData> {
  subject: SUBJECTS;
  data: TData;
}
