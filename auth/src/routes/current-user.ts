import { currentUser } from "@venuepass/common";
import express from "express";

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
