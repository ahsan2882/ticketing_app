import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { UserPayload } from "../models/user.model";

declare global {
  namespace Express {
    interface Request {
      currentUser?: UserPayload;
    }
  }
}

export const currentUser = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.session?.jwt) {
    return next();
  }

  try {
    const payload = jwt.verify(
      req.session.jwt,
      process.env.JWT_KEY!,
    ) as UserPayload;
    req.currentUser = payload;
  } catch (err) {
    // If JWT verification fails, we simply proceed without setting currentUser
    console.error("JWT verification failed:", err);
  }
  next();
};
