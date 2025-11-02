import { Request, Response } from "express";
import { translateText } from "../services/translation.service.js";
import { supabaseAdmin } from "../configs/supabase.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { uploadFile } from "./upload.controller.js";

export const createContent = async (req: AuthRequest, res: Response) => {
  try {
    const authorId = req.user?.id;
    const { title, body, category, tags, language, is_published } = req.body;

    // 🔹 Upload cover image (if provided)
    let cover_url: string | null = null;
    if ((req as any).file) {
      const uploadReq = {
        ...req,
        file: (req as any).file,
        body: { folder: `bellytalk/content_covers/${authorId}` },
      };
      const uploadRes = await new Promise<any>((resolve) => {
        (uploadFile as any)(uploadReq, {
          status: () => ({ json: (data: any) => resolve(data) }),
        } as any);
      });
      cover_url = uploadRes?.result?.secure_url || null;
    }

    // 🔹 Insert into Supabase (use admin client to avoid RLS issues)
    const { data, error } = await supabaseAdmin
      .from("educational_content")
      .insert([
        {
          author_id: authorId,
          title,
          body,
          category,
          tags,
          language,
          cover_url,
          is_published: is_published ?? false,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ data });
  } catch (err: any) {
    console.error("createContent error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getAllContent = async (req: Request, res: Response) => {
  try {
    const { query, lang, page = 1, limit = 10 } = req.query;
    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;

    let supabaseQuery =   supabaseAdmin
      .from("educational_content")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (query) supabaseQuery = supabaseQuery.ilike("title", `%${query}%`);
    if (lang) supabaseQuery = supabaseQuery.eq("language", lang);

    const { data, error } = await supabaseQuery;
    if (error) throw error;

    res.json({ data, page: Number(page) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getSingleContent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { lang } = req.query;

    const { data: content, error } = await supabaseAdmin
      .from("educational_content")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !content) return res.status(404).json({ error: "Not found" });

    // Auto-translate if language requested
    if (lang && lang !== content.language) {
      const translatedBody = await translateText(content.body, String(lang), content.language);
      const translatedTitle = await translateText(content.title, String(lang), content.language);
      content.body = translatedBody;
      content.title = translatedTitle;
      content.language = String(lang);
    }

    res.json({ data: content });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateContent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const { data, error } = await supabaseAdmin
      .from("educational_content")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteContent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from("educational_content").delete().eq("id", id);
    if (error) throw error;
    res.json({ message: "Content deleted" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// Optional endpoint — explicit translation request
export const translateContent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { targetLang } = req.body;

    const { data: content } = await supabaseAdmin
      .from("educational_content")
      .select("title, body, language")
      .eq("id", id)
      .single();

    if (!content) return res.status(404).json({ error: "Content not found" });

    const translatedBody = await translateText(content.body, targetLang, content.language);
    const translatedTitle = await translateText(content.title, targetLang, content.language);

    res.json({
      translated: { title: translatedTitle, body: translatedBody, targetLang },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getMyContents = async (req: Request, res: Response) => {
  try {
    const authorId = (req as AuthRequest).user?.id;
    const { query, lang, page = 1, limit = 10 } = req.query;
    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;

    // Fix: Create base query and await the result
    let supabaseQuery = supabaseAdmin
      .from("educational_content")
      .select("*")
      .eq("author_id", authorId)
      .order("created_at", { ascending: false })
      .range(from, to);

    // Apply filters
    if (query) supabaseQuery = supabaseQuery.ilike("title", `%${query}%`);
    if (lang) supabaseQuery = supabaseQuery.eq("language", lang);

    // Fix: Await the query execution
    const { data, error } = await supabaseQuery;

    if (error) throw error;

    // Fix: Return proper response format matching getAllContent
    res.json({ data, page: Number(page) });
  } catch (err: any) {
    console.error("getMyContents error:", err);
    res.status(500).json({ error: err.message });
  }
};