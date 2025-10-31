import { Request, Response } from "express";
import { supabaseAdmin, supabase } from "../configs/supabase.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { uploadFile } from "./upload.controller.js";
import { v4 as uuidv4 } from "uuid";

export const listProducts = async (req: Request, res: Response) => {
  try {
    const { q, category, page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, Number(page));
    const lim = Math.min(100, Number(limit) || 20);
    const from = (pageNum - 1) * lim;
    const to = from + lim - 1;

    let query = supabaseAdmin
      .from("products")
      .select("*")
      .range(from, to)
      .order("created_at", { ascending: false });

    if (q) query = query.ilike("title", `%${String(q)}%`);
    if (category) query = query.eq("category", String(category));

    const { data, error } = await query;
    if (error) throw error;
    res.json({ products: data });
  } catch (err: any) {
    console.error("listProducts error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Product not found" });
    res.json({ product: data });
  } catch (err: any) {
    console.error("getProduct error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id; // from auth middleware
    const payload = req.body;

    // handle file upload if exists
    if ((req as any).file) {
      const fileReq = Object.assign({}, req, {
        body: { folder: `bellytalk/products/${userId || "general"}` },
      });

      const uploadRes = await new Promise<any>((resolve) => {
        (uploadFile as any)(
          fileReq,
          {
            status: () => ({
              json: (data: any) => resolve(data),
            }),
          } as any
        );
      });

      if (uploadRes?.result?.secure_url) {
        payload.image_url = uploadRes.result.secure_url;
      }
    }

    payload.id = uuidv4();
    payload.created_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("products")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ product: data });
  } catch (err: any) {
    console.error("createProduct error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id; // if you have auth
    const payload = req.body;
console.log("Updating product:", id, payload);

    // optional: file upload handling
    if ((req as any).file) {
      const fileReq = Object.assign({}, req, {
        body: { folder: `bellytalk/products/${userId}` },
      });

      const uploadRes = await new Promise<any>((resolve) => {
        (uploadFile as any)(fileReq, {
          status: () => ({ json: (data: any) => resolve(data) }),
        } as any);
      });

      if (uploadRes?.result?.secure_url) {
        payload.image_url = uploadRes.result.secure_url;
      }
    }

    const { data, error } = await supabaseAdmin
      .from("products")
      .update(payload)
      .eq("id", id)
      .select().single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json({ message: "Product updated", product: data });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from("products").delete().eq("id", id);
    if (error) throw error;
    res.json({ message: "Product deleted" });
  } catch (err: any) {
    console.error("deleteProduct error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getMyProducts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("created_by", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json({ products: data });
  } catch (err: any) {
    console.error("getMyProducts error:", err);
    res.status(500).json({ error: err.message });
  }
};
