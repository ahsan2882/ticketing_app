import jwt from "jsonwebtoken";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";

declare global {
  var signin: (userId?: string) => Promise<string[]>;
}

let mongo: MongoMemoryReplSet;

jest.mock("../nats-client");
jest.mock("../stripe");

beforeAll(async () => {
  process.env.JWT_KEY = "testing_jwt_key";
  mongo = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  const mongoUri = mongo.getUri();
  await mongoose.connect(mongoUri, {});
});

beforeEach(async () => {
  if (mongoose.connection.db) {
    const collections = await mongoose.connection.db?.collections();
    for (let collection of collections) {
      await collection.deleteMany({});
    }
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();

  if (mongo) {
    await mongo.stop();
  }
});

global.signin = async (userId?: string): Promise<string[]> => {
  // Build a JWT payload. {id,email,name}
  const id = userId ?? new mongoose.Types.ObjectId().toHexString();
  const payload = {
    id,
    email: "test@test.com",
    name: "Test Test",
  };

  // Create the JWT
  const token = jwt.sign(payload, process.env.JWT_KEY!);

  // Build session obj {jwt:MY_JWT}
  const session = { jwt: token };

  // Turn that session into JSON
  const sessionJSON = JSON.stringify(session);

  // Take JSON and encode it as base64
  const base64 = Buffer.from(sessionJSON).toString("base64");

  // return a string thats the cookie with the encoded data
  return [`session=${base64}`];
};
