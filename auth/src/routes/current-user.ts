import express from "express";
import { currentUser } from "../middlewares/current-user";

const router = express.Router();

router.get("/api/users/currentuser", currentUser, (req, res) => {
  res.send({ currentUser: req.currentUser || null });
});
router.all("/api/users/currentuser", (req, res) => {
  res
    .status(405)
    .set("Allow", "GET")
    .send({ errors: [{ message: "Method not allowed" }] });
});

export { router as currentUserRouter };
