import { Request, Response } from "express";
import { supabaseAdmin } from "../configs/supabase";
import { AuthRequest } from "../middlewares/auth.middleware";

export const createHospital = async (req: AuthRequest, res: Response) => {
  try {
    const createdBy = req.user?.id;
    const dataToInsert = { ...req.body, created_by: createdBy };
    const { data, error } = await supabaseAdmin.from("hospitals").insert([dataToInsert]).select().single();
    if (error) throw error;
    res.status(201).json({ data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const getHospitals = async (req: Request, res: Response) => {
  try {
    const { city, service, query, page = 1, limit = 10 } = req.query;
    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;

    let q = supabaseAdmin.from("hospitals").select("*").range(from, to);

    if (city) q = q.ilike("city", `%${city}%`);
    if (query) q = q.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    if (service) q = q.contains("services", [service]);

    const { data, error } = await q;
    if (error) throw error;

    res.json({ data, page: Number(page) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const updateHospital = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from("hospitals")
      .update(req.body)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteHospital = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin.from("hospitals").delete().eq("id", id);
    if (error) throw error;
    res.json({ message: "Hospital deleted" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
export const getMyHospitals = async (req: AuthRequest, res: Response) => {
  try {
    const createdBy = req.user?.id;
    const { city, service, query, page = 1, limit = 10 } = req.query;
    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;

    let q = supabaseAdmin
      .from("hospitals")
      .select("*")
      .eq("created_by", createdBy)
      .range(from, to);

    if (city) q = q.ilike("city", `%${city}%`);
    if (query) q = q.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    if (service) q = q.contains("services", [service]);

    const { data, error } = await q;
    if (error) throw error;

    res.json({ data, page: Number(page) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};