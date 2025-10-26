import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import healthRouter from "./routes/health.route";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());


// Health check
app.use("/api", healthRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
