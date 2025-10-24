import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { healthCheck } from "./controllers/health.controller";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());


// Health check
app.get("/",healthCheck);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
