import { BadRequestError, validateRequest } from "@venuepass/common";
import express, { type Request, type Response } from "express";
import { body } from "express-validator";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";
import { Password } from "../services/password";

const router = express.Router();

router.post(
  "/api/users/signin",
  [
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password")
      .notEmpty()
      .withMessage("Password is required")
      .bail()
      .custom((value) => {
        // Validate length without trimming - use exact input value directly
        if (value.length < 1 || value.length > 50) {
          throw new BadRequestError(
            "Password must be between 1 and 50 characters",
            "credentials",
          );
        }
        // Reject passwords that are only whitespace
        if (/^\s*$/.test(value)) {
          throw new BadRequestError(
            "Password cannot contain only whitespace characters",
            "credentials",
          );
        }
        return true;
      }),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      throw new BadRequestError("Invalid credentials", "credentials");
    }
    const passwordsMatch = await Password.compare(
      existingUser.password,
      password,
    );
    if (!passwordsMatch) {
      throw new BadRequestError("Invalid credentials", "credentials");
    }
    const userJwt = jwt.sign(
      {
        email: existingUser.email,
        id: existingUser.id,
        name: existingUser.name,
      },
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
