const mockJetStreamClient = {
  publish: jest
    .fn()
    .mockResolvedValue({ seq: 1, stream: "mock", duplicate: false }),
};

const mockNatsConnection = {
  jetstream: jest.fn().mockReturnValue(mockJetStreamClient),
};

export const natsClient = {
  get client() {
    return mockNatsConnection;
  },
};
