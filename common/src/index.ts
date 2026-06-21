export { BadRequestError } from "./errors/bad-request-error";
export { CustomError } from "./errors/base-error";
export { NotFoundError } from "./errors/not-found-error";
export { RequestValidationError } from "./errors/request-validation-error";
export { ServiceConnectionError } from "./errors/service-connection-error";
export { UnauthorizedError } from "./errors/unauthorized-error";

export { currentUser } from "./middlewares/current-user";
export { errorHandler } from "./middlewares/error-handler";
export { requireAuth } from "./middlewares/require-auth";
export { validateRequest } from "./middlewares/validate-request";

export type { SerializedError } from "./models/serialize-error.model";
export type { UserPayload } from "./models/user.model";

export { Listener } from "./events/base/base-listener";
export { Publisher } from "./events/base/base-publisher";
export {
  JetStreamSetupService,
  type ConsumerConfig,
} from "./events/jetstream-setup";
export type { TicketCreatedEvent } from "./events/tickets/ticket-created-event";
export type { TicketUpdatedEvent } from "./events/tickets/ticket-updated-event";
export { STREAM_NAME, SUBJECTS, type Event } from "./models/event.model";
export { EventType, TicketCategory, TicketStatus } from "./models/ticket.model";
