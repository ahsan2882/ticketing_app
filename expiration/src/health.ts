import { HealthState } from "@venuepass/common";
import http from "http";

type ExpirationHealthCheck = "nats" | "redis";

export const healthState = new HealthState<ExpirationHealthCheck>([
  "nats",
  "redis",
]);

export class HealthServer {
  private readonly server: http.Server;

  constructor(
    private readonly healthState: HealthState<ExpirationHealthCheck>,
    private readonly port: number = 3000,
  ) {
    this.server = http.createServer((req, res) => {
      if (req.url === "/healthz") {
        this.sendJson(res, 200, { status: "ok" });
        return;
      }

      if (req.url === "/readyz") {
        const redis = this.healthState.isCheckReady("redis");
        const nats = this.healthState.isCheckReady("nats");

        if (!this.healthState.isReady()) {
          this.sendJson(res, 503, {
            status: "not_ready",
            redis,
            nats,
          });
          return;
        }

        this.sendJson(res, 200, {
          status: "ready",
          redis,
          nats,
        });
        return;
      }

      this.sendJson(res, 404, { status: "not_found" });
    });
  }

  start(): void {
    this.server.listen(this.port, () => {
      console.log(`Health server listening on port ${this.port}`);
    });

    this.server.on("error", (err: any) => {
      if (err.code === "EADDRINUSE" || err.code === "EACCES") {
        const errorMsg =
          err.code === "EADDRINUSE"
            ? "Port already in use"
            : `Permission denied on port ${this.port}`;
        console.error(`Health server failed to start: ${errorMsg}`);
      } else {
        console.error(`Health server error on port ${this.port}:`, err.message);
      }
    });
  }

  private sendJson(
    res: http.ServerResponse,
    statusCode: number,
    body: unknown,
  ): void {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  }
}
