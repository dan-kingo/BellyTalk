import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRouter from "./routes/auth.route.js";
import profileRouter from "./routes/profile.route.js";
import adminRouter from "./routes/admin.route.js";
import uploadRouter from "./routes/upload.route.js";
import healthRouter from "./routes/health.route.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Health
app.use("/api", healthRouter);

// Auth & profile
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/admin", adminRouter);
app.use("/api/uploads", uploadRouter);

const PORT = process.env.PORT || 5000;
app.listen(Number(PORT), () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
