export const STREAM_NAME = "EVENTS";

export enum SUBJECTS {
  TicketCreated = "ticket.created",
  TicketUpdated = "ticket.updated",
}

export interface Event<TData> {
  subject: SUBJECTS;
  data: TData;
}
