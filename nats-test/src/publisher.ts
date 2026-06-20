import { connect } from "nats";
import { TicketCreatedPublisher } from "./events/ticket-created-publisher";
import { JetStreamSetupService } from "./jetstream-setup";

const start = async (): Promise<void> => {
  const nc = await connect({
    servers: ["nats://localhost:4222"],
    name: "publisher",
    pingInterval: 5_000,
    maxPingOut: 2,
  });

  console.log("Publisher connected to NATS");

  const jsm = await nc.jetstreamManager();
  const setupService = new JetStreamSetupService(jsm);

  await setupService.ensureStream();

  await new TicketCreatedPublisher(nc).publish({
    id: "123",
    title: "concert",
    price: 20,
  });

  await nc.drain();
};

void start();
