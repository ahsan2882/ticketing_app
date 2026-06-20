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

  const closeGracefully = async (): Promise<void> => {
    console.log("NATS connection closing...");
    await nc.drain();
    process.exit();
  };

  process.on("SIGINT", () => void closeGracefully());
  process.on("SIGTERM", () => void closeGracefully());

  await new TicketCreatedListener(nc).listen();
};

void start();
