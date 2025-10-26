import { Response } from "express";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import { Request } from "express";
import multer from "multer";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const storage = multer.memoryStorage();
export const uploadMiddleware = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

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


export const uploadFile = async (req: Request, res: Response) => {
  try {
    // expects a single file field named 'file'
    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: "No file uploaded. Use field name 'file'." });

    const folder = req.body.folder || "bellytalk/docs";
    const public_id = req.body.public_id; // optional
    const streamUpload = (buffer: Buffer) =>
      new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder, public_id, resource_type: "auto" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(buffer);
      });

    const result = await streamUpload(file.buffer);
    return res.status(201).json({ uploaded: true, result });
  } catch (err) {
    console.error("uploadFile error:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
};

