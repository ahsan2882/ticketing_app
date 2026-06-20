import { connect } from "nats";
import { TicketCreatedListener } from "./events/ticket-created-listener";

const start = async (): Promise<void> => {
  // nats connection
  const nc = await connect({
    // url to connect to
    servers: ["nats://localhost:4222"],
    // client name
    name: "orders-service-listener",
    // heartbeat interval to idle client
    pingInterval: 5_000,
    // max number of tries to connect to client
    maxPingOut: 2,
  });

  console.log("Listener connected to NATS");
  let isShuttingDown = false;
  const closeGracefully = async (): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log("NATS connection closing...");
    try {
      await nc.drain();
      process.exit(0);
    } catch (err) {
      console.error("Error during NATS drain:", err);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => void closeGracefully());
  process.on("SIGTERM", () => void closeGracefully());

  await new TicketCreatedListener(nc).listen();
};

void start().catch((err) => {
  console.error("Listener startup failed:", err);
  process.exit(1);
});
