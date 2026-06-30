import { HealthState } from "@venuepass/common";

type TicketsHealthCheck = "mongo" | "nats";

export const healthState = new HealthState<TicketsHealthCheck>([
  "mongo",
  "nats",
]);
