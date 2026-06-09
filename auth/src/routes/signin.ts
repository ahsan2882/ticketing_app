import express, { type Request, type Response } from "express";
import { body } from "express-validator";
import jwt from "jsonwebtoken";

import { BadRequestError } from "../errors/bad-request-error";
import { validateRequest } from "../middlewares/validate-request";
import { User } from "../models/user.model";
import { Password } from "../services/password";

const router = express.Router();

router.post(
  "/api/users/signin",
  [
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password").trim().notEmpty().withMessage("Password is required"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      throw new BadRequestError("Invalid credentials", "email");
    }
    const passwordsMatch = await Password.compare(
      existingUser.password,
      password,
    );
    if (!passwordsMatch) {
      throw new BadRequestError("Invalid credentials", "password");
    }
    const userJwt = jwt.sign(
      { email: existingUser.email, id: existingUser.id },
      process.env.JWT_KEY!,
      { expiresIn: "1h" },
    );
    req.session = {
      jwt: userJwt,
    };
    res.status(200).send(existingUser);
  },
);

export { router as signInRouter };
