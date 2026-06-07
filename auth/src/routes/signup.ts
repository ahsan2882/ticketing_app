import type { Request, Response } from "express";
import express from "express";
import { body, validationResult } from "express-validator";
import { BadRequestError } from "../errors/bad-request-error";
import { DatabaseConnectionError } from "../errors/database-connection-error";
import { RequestValidationError } from "../errors/request-validation-error";
import { User } from "../models/user.model";
import jwt from "jsonwebtoken";

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
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new RequestValidationError(errors.array());
    }
    const { email, password } = req.body;
    const isExistingUser = await User.findOne({ email });
    if (isExistingUser) {
      throw new BadRequestError("User with this email already exists");
    }
    const user = User.build({ email, password });
    try {
      await user.save();
      const userJwt = jwt.sign(
        { email: user.email, id: user.id },
        process.env.JWT_KEY!,
      );
      req.session = {
        jwt: userJwt,
      };
      res.status(201).send(user);
    } catch (err) {
      console.error(err);
      throw new DatabaseConnectionError();
    }
  },
);

export { router as signUpRouter };
