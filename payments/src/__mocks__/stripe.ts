export const stripe = {
  paymentIntents: {
    create: jest.fn().mockResolvedValue({
      id: "pi_mock_123",
      client_secret: "pi_mock_123_secret_abc",
      amount: 1000,
      currency: "usd",
      status: "requires_payment_method",
    }),
    retrieve: jest.fn().mockImplementation(() => Promise.resolve({
      id: "pi_existing_123",
      client_secret: "pi_existing_123_secret",
      status: "requires_payment_method",
    })),
  },
  refunds: {
    create: jest.fn().mockResolvedValue({
      id: "ref_abc_123",
      object: "refund", // Required for downstream assertion in cancelled-order test
    }),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};
