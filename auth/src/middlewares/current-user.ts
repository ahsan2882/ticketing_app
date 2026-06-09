import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { type UserPayload } from "../models/user.model";

declare global {
  namespace Express {
    interface Request {
      currentUser?: UserPayload;
    }
  }
}

export const currentUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.session?.jwt) {
    return next();
  }

  try {
    const payload = jwt.verify(req.session.jwt, process.env.JWT_KEY!);
    if (
      typeof payload === "object" &&
      payload !== null &&
      typeof payload.id === "string" &&
      typeof payload.email === "string"
    ) {
      req.currentUser = {
        id: payload.id,
        email: payload.email,
        name: payload.name,
      };
    }
  } catch (err) {
    // If JWT verification fails, we simply proceed without setting currentUser
    console.error("JWT verification failed:", err);
  }
  next();
};
