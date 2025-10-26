import { Response } from "express";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import { Request } from "express";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * GET /api/uploads/sign
 * Returns a signature and timestamp for client direct upload
 * Query params optionally: folder, eager transformations, public_id
 */
export const getUploadSignature = async (req: Request, res: Response) => {
  try {
    const ts = Math.floor(Date.now() / 1000);
    const folder = req.query.folder ? String(req.query.folder) : "bellytalk";
    // parameters to sign
    const params: Record<string, any> = { timestamp: ts, folder };
    // If you want to allow specific public_id or eager options, include them carefully
    const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!);

    return res.status(200).json({
      signature,
      timestamp: ts,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      folder
    });
  } catch (err) {
    console.error("cloudinary sign error:", err);
    return res.status(500).json({ error: "Failed to create signature" });
  }
};
