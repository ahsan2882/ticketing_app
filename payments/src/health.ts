import { HealthState } from "@venuepass/common";

type PaymentsHealthCheck = "mongo" | "nats";

export const healthState = new HealthState<PaymentsHealthCheck>([
  "mongo",
  "nats",
]);
