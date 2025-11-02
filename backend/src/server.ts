import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
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
import groupChatRouter from "./routes/groupchat.route.js";
import adminPanelRouter from "./routes/admin.panel.route.js";
import { logActivity } from "./middlewares/logging.middleware.js";

dotenv.config();

const app = express();
app.use(cors({
  origin: [
    'https://belly-talk.vercel.app',
    'http://localhost:3000', 
    'https://bellytalk-admin.vercel.app', 
    'http://localhost:5000',
    'https://bellytalk.onrender.com',
  ],
  credentials: true,
}));
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
app.use("/api/groupchats", groupChatRouter);
app.use("/api/admin/panel", adminPanelRouter);

// not found + error handler
app.use(notFoundHandler);
app.use(errorHandler);

// performance monitoring
app.use(logActivity);
app.use(helmet())
app.use(compression());
app.use(rateLimit({ windowMs: 1 * 60 * 1000, max: 100 }));
// start server
const PORT = process.env.PORT || 5000;
app.listen(Number(PORT), () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
