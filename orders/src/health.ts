import { HealthState } from "@venuepass/common";

type OrdersHealthCheck = "mongo" | "nats";

export const healthState = new HealthState<OrdersHealthCheck>([
  "mongo",
  "nats",
]);
