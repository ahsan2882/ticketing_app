import { SUBJECTS, type OrderCreatedEvent } from "@venuepass/common";
import type { JsMsg } from "nats";
import { getExpirationQueue } from "../../../queues/expiration-queue";
import { OrderCreatedListener } from "../order-created-listener";

jest.mock("../../../queues/expiration-queue", () => ({
  getExpirationQueue: jest.fn(),
}));

const mockAdd = jest.fn();
const mockQueue = { add: mockAdd };
const mockNatsConnection = {
  jetstream: jest.fn().mockReturnValue({
    publish: jest.fn(),
  }),
};


const buildData = (
  expiresAt: string,
): OrderCreatedEvent["data"] =>
  ({
    id: "order-123",
    userId: "user-123",
    version: 0,
    status: "created",
    expiresAt,
    ticket: {
      id: "ticket-123",
      price: 50,
    },
  }) as OrderCreatedEvent["data"];

const buildMessage = (): JsMsg =>
  ({
    ack: jest.fn(),
  }) as unknown as JsMsg;

describe("OrderCreatedListener", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getExpirationQueue).mockReturnValue(mockQueue as never);
    mockAdd.mockResolvedValue({ id: "job-1" });
  });

  it("uses the order-created subject and default durable name", () => {
    const listener = new OrderCreatedListener(mockNatsConnection as never);

    expect(listener.subject).toEqual(SUBJECTS.OrderCreated);
    expect(listener.durableName).toEqual("expiration-service-order-created");
  });

  it("accepts a custom durable name", () => {
    const listener = new OrderCreatedListener(
      mockNatsConnection as never,
      "custom-expiration-consumer",
    );

    expect(listener.durableName).toEqual("custom-expiration-consumer");
  });

  it("adds an expiration job using the order id and calculated future delay", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-07-14T08:00:00.000Z"));
    const listener = new OrderCreatedListener(mockNatsConnection as never);
    const msg = buildMessage();
    const data = buildData("2026-07-14T08:15:00.000Z");

    await listener.onMessage(data, msg);

    expect(getExpirationQueue).toHaveBeenCalledTimes(1);
    expect(mockAdd).toHaveBeenCalledWith(
      { orderId: data.id },
      { delay: 15 * 60 * 1000 },
    );
  });

  it("uses a zero delay when the order is already expired", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-07-14T08:00:00.000Z"));
    const listener = new OrderCreatedListener(mockNatsConnection as never);
    const msg = buildMessage();
    const data = buildData("2026-07-14T07:45:00.000Z");

    await listener.onMessage(data, msg);

    expect(mockAdd).toHaveBeenCalledWith(
      { orderId: data.id },
      { delay: 0 },
    );
  });

  it("uses a zero delay when the order expires at the current time", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-07-14T08:00:00.000Z"));
    const listener = new OrderCreatedListener(mockNatsConnection as never);
    const msg = buildMessage();
    const data = buildData("2026-07-14T08:00:00.000Z");

    await listener.onMessage(data, msg);

    expect(mockAdd).toHaveBeenCalledWith(
      { orderId: data.id },
      { delay: 0 },
    );
  });

  it("acknowledges only after the delayed job is added", async () => {
    const callOrder: string[] = [];
    mockAdd.mockImplementationOnce(async () => {
      callOrder.push("add");
      return { id: "job-1" };
    });
    const msg = buildMessage();
    (msg.ack as jest.Mock).mockImplementation(() => callOrder.push("ack"));
    const listener = new OrderCreatedListener(mockNatsConnection as never);

    await listener.onMessage(
      buildData(new Date(Date.now() + 10_000).toISOString()),
      msg,
    );

    expect(callOrder).toEqual(["add", "ack"]);
    expect(msg.ack).toHaveBeenCalledTimes(1);
  });

  it("does not acknowledge when adding the queue job fails", async () => {
    mockAdd.mockRejectedValueOnce(new Error("redis unavailable"));
    const listener = new OrderCreatedListener(mockNatsConnection as never);
    const msg = buildMessage();

    await expect(
      listener.onMessage(
        buildData(new Date(Date.now() + 10_000).toISOString()),
        msg,
      ),
    ).rejects.toThrow("redis unavailable");

    expect(msg.ack).not.toHaveBeenCalled();
  });

  it("does not acknowledge when the expiration queue is not initialized", async () => {
    jest
      .mocked(getExpirationQueue)
      .mockImplementationOnce(() => {
        throw new Error("Expiration queue has not been initialized");
      });
    const listener = new OrderCreatedListener(mockNatsConnection as never);
    const msg = buildMessage();

    await expect(
      listener.onMessage(
        buildData(new Date(Date.now() + 10_000).toISOString()),
        msg,
      ),
    ).rejects.toThrow("Expiration queue has not been initialized");

    expect(mockAdd).not.toHaveBeenCalled();
    expect(msg.ack).not.toHaveBeenCalled();
  });
});
