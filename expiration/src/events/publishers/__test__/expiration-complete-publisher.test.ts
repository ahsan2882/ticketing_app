import { SUBJECTS } from "@venuepass/common";
import { ExpirationCompletePublisher } from "../expiration-complete-publisher";

const mockNatsConnection = {
  jetstream: jest.fn().mockReturnValue({
    publish: jest.fn(),
  }),
};

describe("ExpirationCompletePublisher", () => {
  it("uses the expiration-complete subject", () => {
    const publisher = new ExpirationCompletePublisher(mockNatsConnection as never);

    expect(publisher.subject).toEqual(SUBJECTS.ExpirationComplete);
  });
});
