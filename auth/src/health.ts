import { HealthState } from "@venuepass/common";

type AuthHealthCheck = "mongo";

export const healthState = new HealthState<AuthHealthCheck>(["mongo"]);
