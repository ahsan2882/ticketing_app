import express, { type Request, type Response } from "express";
import { body } from "express-validator";
import jwt from "jsonwebtoken";

import { BadRequestError } from "../errors/bad-request-error";
import { DatabaseConnectionError } from "../errors/database-connection-error";
import { validateRequest } from "../middlewares/validate-request";
import { User } from "../models/user.model";

const router = express.Router();

router.post(
  "/api/users/signup",
  [
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password")
      .trim()
      .isLength({ min: 4, max: 20 })
      .withMessage("Password must be between 4 and 20 characters"),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const isExistingUser = await User.findOne({ email });
    if (isExistingUser) {
      throw new BadRequestError("User with this email already exists");
    }
    const user = User.build({ email, password });
    try {
      await user.save();
    } catch (err) {
      console.error(err);
      throw new DatabaseConnectionError();
    }
    const userJwt = jwt.sign(
      { email: user.email, id: user.id },
      process.env.JWT_KEY!,
      { expiresIn: "1h" },
    );
    req.session = {
      jwt: userJwt,
    };
    res.status(201).send(user);
  },
);

export { router as signUpRouter };
