import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import authRouter from "./routes/auth.route.js";
import profileRouter from "./routes/profile.route.js";
import adminRouter from "./routes/admin.route.js";
import uploadRouter from "./routes/upload.route.js";
import healthRouter from "./routes/health.route.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import contentRouter from "./routes/content.route.js";
import hospitalRouter from "./routes/hospital.route.js";
import chatRouter from "./routes/chat.route.js";
import shopRouter from "./routes/shop.route.js";
import audioRouter from "./routes/audio.route.js";
import hmsWebhookRouter from "./routes/hms.webhook.route.js";
import videoRouter from "./routes/video.route.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("combined"));

app.get("/api/auth/redirect", (req, res) => {
  res.json({ message: "Email verified successfully! You can close this window." });
});

// routes
app.use("/api", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/admin", adminRouter);
app.use("/api/uploads", uploadRouter);
app.use("/api/content", contentRouter);
app.use("/api/hospitals", hospitalRouter);
app.use("/api/chat", chatRouter);
app.use("/api/shop", shopRouter);
app.use("/api/audio", audioRouter);
app.use("/api/hms/webhook", express.json({ limit: "2mb" }), hmsWebhookRouter);
app.use("/api/video", videoRouter);

// not found + error handler
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(Number(PORT), () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
