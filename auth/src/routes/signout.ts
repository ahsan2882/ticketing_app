import express, { type Request, type Response } from "express";

const router = express.Router();

router.post("/api/users/signout", (req: Request, res: Response) => {
  req.session = null;
  res.send({});
});

router.all("/api/users/signout", (req, res) => {
  res
    .status(405)
    .set("Allow", "POST")
    .send({ errors: [{ message: "Method not allowed" }] });
});

export { router as signOutRouter };
