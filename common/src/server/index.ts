export { BadRequestError } from "../errors/bad-request-error";
export { CustomError } from "../errors/base-error";
export { NotFoundError } from "../errors/not-found-error";
export { RequestValidationError } from "../errors/request-validation-error";
export { ServiceConnectionError } from "../errors/service-connection-error";
export { UnauthorizedError } from "../errors/unauthorized-error";

export { Listener } from "../events/base/base-listener";
export { Publisher } from "../events/base/base-publisher";
export type { ExpirationCompleteEvent } from "../events/expiration/expiration-complete-event";
export {
  JetStreamSetupService,
  type ConsumerConfig,
} from "../events/jetstream-setup";
export type { OrderAwaitingPaymentEvent } from "../events/orders/order-awaiting-payment-event";
export type { OrderCancelledEvent } from "../events/orders/order-cancelled-event";
export type { OrderCompletedEvent } from "../events/orders/order-completed-event";
export type { OrderCreatedEvent } from "../events/orders/order-created-event";
export type { PaymentClearedEvent } from "../events/payments/payment-cleared-event";
export type { PaymentRefundEvent } from "../events/payments/payment-refund-event";
export type { TicketCreatedEvent } from "../events/tickets/ticket-created-event";
export type { TicketUpdatedEvent } from "../events/tickets/ticket-updated-event";

export { HealthState } from "../health/health-state";

export { currentUser } from "../middlewares/current-user";
export { errorHandler } from "../middlewares/error-handler";
export { requireAuth } from "../middlewares/require-auth";
export { validateRequest } from "../middlewares/validate-request";

export { STREAM_NAME, SUBJECTS, type Event } from "../models/event.model";
export type { SerializedError } from "../models/serialize-error.model";
