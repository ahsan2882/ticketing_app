import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import { app } from "../app";

declare global {
  var signin: (
    email?: string,
    password?: string,
    name?: string,
  ) => Promise<string[]>;
}

let mongo: MongoMemoryServer | undefined;
let requiresMongo = true;

const isDatabaseFreeTestSuite = (): boolean => {
  const testPath = expect.getState().testPath?.replaceAll("\\", "/") ?? "";

  return testPath.endsWith("/src/services/__test__/password.test.ts");
};

beforeAll(async () => {
  process.env.JWT_KEY = "testing_jwt_key";
  requiresMongo = !isDatabaseFreeTestSuite();

  if (!requiresMongo) {
    return;
  }

  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
}, 30_000);

beforeEach(async () => {
  if (!requiresMongo || !mongoose.connection.db) {
    return;
  }

  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  if (!requiresMongo) {
    return;
  }

  // Disconnect clients first so MongoMemoryServer does not wait on an active
  // Mongoose connection while shutting down the mongod process.
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (mongo) {
    await mongo.stop();
    mongo = undefined;
  }
}, 30_000);

global.signin = async (
  email = "test@test.com",
  password = "validpass",
  name = "Test Test",
): Promise<string[]> => {
  await request(app)
    .post("/api/users/signup")
    .send({ email, password, name })
    .expect(201);

  const response = await request(app)
    .post("/api/users/signin")
    .send({ email, password })
    .expect(200);

  const cookie = response.get("Set-Cookie");
  if (!cookie) {
    throw new Error("signin() helper: no cookie returned");
  }

  return cookie;
};
