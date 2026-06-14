import { currentUser, errorHandler, NotFoundError } from "@venuepass/common";
import bodyParser from "body-parser";
import cookieSession from "cookie-session";
import express from "express";

import { createTicketRouter } from "./routes/create-ticket";
import { findAllTicketRouter } from "./routes/find-all-tickets";
import { findTicketRouter } from "./routes/find-ticket";
import { updateTicketRouter } from "./routes/update-ticket";

const app = express();
app.set("trust proxy", true);

app.use(bodyParser.json());
app.use(
  cookieSession({
    signed: false,
    secure:
      process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test",
    maxAge: 3600000,
  }),
);

app.use(currentUser);

app.use(createTicketRouter);
app.use(findTicketRouter);
app.use(findAllTicketRouter);
app.use(updateTicketRouter);

app.all("/{*splat}", async (req, res) => {
  throw new NotFoundError();
});

app.use(errorHandler);

export { app };
