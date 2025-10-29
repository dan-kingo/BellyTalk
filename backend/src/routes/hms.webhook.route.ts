import { Router } from "express";
import { handleHMSWebhook } from "../controllers/hms.webhook.controller.js";

const router = Router();

// raw body parsing required for signature validation (optional)
router.post("/", handleHMSWebhook);

export default router;
