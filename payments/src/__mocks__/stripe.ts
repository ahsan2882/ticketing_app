export const stripe = {
  paymentIntents: {
    create: jest.fn().mockResolvedValue({
      id: "pi_mock_123",
      client_secret: "pi_mock_123_secret_abc",
      amount: 1000,
      currency: "usd",
      status: "requires_payment_method",
    }),
  },
  webhooks: {
    constructEvent: jest.fn(),
  },
};
