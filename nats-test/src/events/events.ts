export const STREAM_NAME = "EVENTS";

export enum SUBJECTS {
  TicketCreated = "ticket.created",
  OrderUpdated = "order.updated",
}

export interface TicketCreatedEvent {
  subject: SUBJECTS.TicketCreated;
  data: { id: string; title: string; price: number };
}
