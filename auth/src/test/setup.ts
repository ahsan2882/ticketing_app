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

let mongo: MongoMemoryServer;

beforeAll(async () => {
  process.env.JWT_KEY = "testing_jwt_key";
  mongo = await MongoMemoryServer.create();
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
  if (mongo) {
    await mongo.stop();
  }
  await mongoose.connection.close();
});

global.signin = async (
  email = "test@test.com",
  password = "validpass",
  name = "Test Test",
): Promise<string[]> => {
  // Sign up first (idempotent — if user exists the test db was just cleared anyway)
  await request(app)
    .post("/api/users/signup")
    .send({ email, password, name })
    .expect(201);

  const response = await request(app)
    .post("/api/users/signin")
    .send({ email, password })
    .expect(200);

  const cookie = response.get("Set-Cookie");
  if (!cookie) throw new Error("signin() helper: no cookie returned");

  return cookie;
};
