const mockPublish = jest.fn();
const mockPublisherConstructor = jest.fn().mockImplementation(() => ({
  publish: mockPublish,
}));

const mockSetReady = jest.fn();
const mockSetNotReady = jest.fn();

interface FakeQueue {
  process: jest.Mock;
  isReady: jest.Mock;
  on: jest.Mock;
  close: jest.Mock;
  client: {
    on: jest.Mock;
  };
}

let mockQueue: FakeQueue;
let mockProcessHandler: ((job: { data: { orderId: string } }) => Promise<void>) | undefined;
let mockQueueHandlers: Record<string, (...args: any[]) => void>;
let mockClientHandlers: Record<string, (...args: any[]) => void>;

const mockQueueConstructor = jest.fn().mockImplementation(() => mockQueue);

jest.mock("bull", () => ({
  __esModule: true,
  default: mockQueueConstructor,
}));

jest.mock("../../events/publishers/expiration-complete-publisher", () => ({
  ExpirationCompletePublisher: mockPublisherConstructor,
}));

jest.mock("../../health", () => ({
  healthState: {
    setReady: mockSetReady,
    setNotReady: mockSetNotReady,
  },
}));

const mockNatsConnection = { name: "mock-nats-client" };

jest.mock("../../nats-client", () => ({
  natsClient: {
    get client() {
      return mockNatsConnection;
    },
  },
}));

const createQueue = (): FakeQueue => {
  mockQueueHandlers = {};
  mockClientHandlers = {};

  return {
    process: jest.fn((handler: (job: { data: { orderId: string } }) => Promise<void>) => {
      mockProcessHandler = handler;
    }),
    isReady: jest.fn().mockResolvedValue(undefined),
    on: jest.fn((event: string, handler: (...args: any[]) => void) => {
      mockQueueHandlers[event] = handler;
    }),
    close: jest.fn().mockResolvedValue(undefined),
    client: {
      on: jest.fn((event: string, handler: (...args: any[]) => void) => {
        mockClientHandlers[event] = handler;
      }),
    },
  };
};

const loadQueueModule = async () => {
  jest.resetModules();
  return import("../expiration-queue");
};

describe("expiration queue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueue = createQueue();
    mockProcessHandler = undefined;
    mockPublish.mockResolvedValue(undefined);
  });

  it("throws when the queue is accessed before initialization", async () => {
    const { getExpirationQueue } = await loadQueueModule();

    expect(() => getExpirationQueue()).toThrow(
      "Expiration queue has not been initialized",
    );
  });

  it("creates the Bull queue with the expected Redis and retry configuration", async () => {
    const { initializeExpirationQueue } = await loadQueueModule();

    await initializeExpirationQueue({ redisHost: "redis.internal" });

    expect(mockQueueConstructor).toHaveBeenCalledWith("order:expiration", {
      redis: {
        host: "redis.internal",
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: 5000,
      },
    });
  });

  it("marks Redis not ready before connecting and ready after Bull is ready", async () => {
    const { initializeExpirationQueue } = await loadQueueModule();

    await initializeExpirationQueue({ redisHost: "redis.internal" });

    expect(mockSetNotReady).toHaveBeenCalledWith("redis");
    expect(mockQueue.isReady).toHaveBeenCalledTimes(1);
    expect(mockSetReady).toHaveBeenCalledWith("redis");
    expect(
      mockSetNotReady.mock.invocationCallOrder[0],
    ).toBeLessThan(mockSetReady.mock.invocationCallOrder[0]!);
  });

  it("returns the initialized queue", async () => {
    const { getExpirationQueue, initializeExpirationQueue } =
      await loadQueueModule();

    await initializeExpirationQueue({ redisHost: "redis.internal" });

    expect(getExpirationQueue()).toBe(mockQueue);
  });

  it("registers a processor that publishes expiration.complete with the order id", async () => {
    const { initializeExpirationQueue } = await loadQueueModule();
    await initializeExpirationQueue({ redisHost: "redis.internal" });

    expect(mockQueue.process).toHaveBeenCalledTimes(1);
    expect(mockProcessHandler).toBeDefined();

    await mockProcessHandler!({ data: { orderId: "order-456" } });

    expect(mockPublisherConstructor).toHaveBeenCalledWith(mockNatsConnection);
    expect(mockPublish).toHaveBeenCalledWith({ orderId: "order-456" });
  });

  it("propagates publisher failures so Bull can retry the job", async () => {
    mockPublish.mockRejectedValueOnce(new Error("NATS publish failed"));
    const { initializeExpirationQueue } = await loadQueueModule();
    await initializeExpirationQueue({ redisHost: "redis.internal" });

    await expect(
      mockProcessHandler!({ data: { orderId: "order-456" } }),
    ).rejects.toThrow("NATS publish failed");
  });

  it("marks Redis not ready and rethrows when initial readiness fails", async () => {
    mockQueue.isReady.mockRejectedValueOnce(new Error("Redis unavailable"));
    const { initializeExpirationQueue } = await loadQueueModule();

    await expect(
      initializeExpirationQueue({ redisHost: "redis.internal" }),
    ).rejects.toThrow("Redis unavailable");

    expect(mockSetNotReady).toHaveBeenLastCalledWith("redis");
    expect(mockSetReady).not.toHaveBeenCalled();
  });

  it("registers queue and Redis client lifecycle handlers", async () => {
    const { initializeExpirationQueue } = await loadQueueModule();

    await initializeExpirationQueue({ redisHost: "redis.internal" });

    expect(mockQueue.on).toHaveBeenCalledWith("error", expect.any(Function));
    expect(mockQueue.on).toHaveBeenCalledWith("failed", expect.any(Function));
    expect(mockQueue.client.on).toHaveBeenCalledWith(
      "ready",
      expect.any(Function),
    );
    expect(mockQueue.client.on).toHaveBeenCalledWith(
      "end",
      expect.any(Function),
    );
    expect(mockQueue.client.on).toHaveBeenCalledWith(
      "reconnecting",
      expect.any(Function),
    );
  });

  it("marks Redis not ready when Bull emits an error", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation();
    const { initializeExpirationQueue } = await loadQueueModule();
    await initializeExpirationQueue({ redisHost: "redis.internal" });
    const error = new Error("queue error");

    mockQueueHandlers.error!(error);

    expect(mockSetNotReady).toHaveBeenCalledWith("redis");
    expect(consoleError).toHaveBeenCalledWith(
      "Redis/Bull queue error:",
      error,
    );
  });

  it("marks Redis ready when the Redis client reconnects successfully", async () => {
    const { initializeExpirationQueue } = await loadQueueModule();
    await initializeExpirationQueue({ redisHost: "redis.internal" });
    mockSetReady.mockClear();

    mockClientHandlers.ready!();

    expect(mockSetReady).toHaveBeenCalledWith("redis");
  });

  it.each(["end", "reconnecting"])(
    "marks Redis not ready when the Redis client emits %s",
    async (event: string) => {
      jest.spyOn(console, "error").mockImplementation();
      jest.spyOn(console, "warn").mockImplementation();
      const { initializeExpirationQueue } = await loadQueueModule();
      await initializeExpirationQueue({ redisHost: "redis.internal" });
      mockSetNotReady.mockClear();

      mockClientHandlers[event]!();

      expect(mockSetNotReady).toHaveBeenCalledWith("redis");
    },
  );

  it("logs permanently failed jobs with the order and attempt count", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation();
    const { initializeExpirationQueue } = await loadQueueModule();
    await initializeExpirationQueue({ redisHost: "redis.internal" });
    const error = new Error("publish failed");

    mockQueueHandlers.failed!(
      { data: { orderId: "order-789" }, attemptsMade: 3 },
      error,
    );

    expect(consoleError).toHaveBeenCalledWith(
      "Expiration job for orderId order-789 failed permanently after 3 attempts:",
      error,
    );
  });

  it("closes the initialized queue", async () => {
    const { closeExpirationQueue, initializeExpirationQueue } =
      await loadQueueModule();
    await initializeExpirationQueue({ redisHost: "redis.internal" });

    await closeExpirationQueue();

    expect(mockQueue.close).toHaveBeenCalledTimes(1);
  });

  it("logs and suppresses closing before initialization", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation();
    const { closeExpirationQueue } = await loadQueueModule();

    await expect(closeExpirationQueue()).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith(
      "Error closing Redis/Bull queue:",
      expect.objectContaining({
        message: "Expiration queue has not been initialized",
      }),
    );
  });

  it("logs and suppresses errors from Bull close", async () => {
    const closeError = new Error("close failed");
    mockQueue.close.mockRejectedValueOnce(closeError);
    const consoleError = jest.spyOn(console, "error").mockImplementation();
    const { closeExpirationQueue, initializeExpirationQueue } =
      await loadQueueModule();
    await initializeExpirationQueue({ redisHost: "redis.internal" });

    await expect(closeExpirationQueue()).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith(
      "Error closing Redis/Bull queue:",
      closeError,
    );
  });
});
