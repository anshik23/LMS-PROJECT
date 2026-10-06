import { Router } from "express";

import {
  subscribeToCourse,
} from "../controllers/subscriptionController.js";

const router = Router();

router.post(
  "/subscribe",
  subscribeToCourse
);

export default router;