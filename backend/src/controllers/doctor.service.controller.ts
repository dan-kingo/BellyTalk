import { Request, Response } from "express";
import { supabaseAdmin } from "../configs/supabase.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";

type ProfileRole = "mother" | "doctor" | "admin" | "counselor" | string;

const getRole = async (userId: string): Promise<ProfileRole | null> => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data.role as ProfileRole;
};

const parsePagination = (query: Request["query"]) => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { page, limit, from, to };
};

export const listDoctorServices = async (req: Request, res: Response) => {
  try {
    const { doctor_id, service_mode } = req.query;
    const { page, from, to } = parsePagination(req.query);

    let q = supabaseAdmin
      .from("doctor_services")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .range(from, to)
      .order("created_at", { ascending: false });

    if (doctor_id) q = q.eq("doctor_id", String(doctor_id));
    if (service_mode) q = q.eq("service_mode", String(service_mode));

    const { data, error, count } = await q;
    if (error) throw error;

    return res.json({ services: data || [], page, total: count || 0 });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to list services" });
  }
};

export const listMyDoctorServices = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = await getRole(userId);
    if (!role) return res.status(403).json({ error: "Profile not found" });

    const targetDoctorId =
      role === "admin" && req.query.doctor_id
        ? String(req.query.doctor_id)
        : userId;
    const { page, from, to } = parsePagination(req.query);

    const { data, error, count } = await supabaseAdmin
      .from("doctor_services")
      .select("*", { count: "exact" })
      .eq("doctor_id", targetDoctorId)
      .range(from, to)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.json({ services: data || [], page, total: count || 0 });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to list my services" });
  }
};

export const createDoctorService = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = await getRole(userId);
    if (!role) return res.status(403).json({ error: "Profile not found" });

    const doctorId =
      role === "admin" && req.body.doctor_id ? req.body.doctor_id : userId;

    const { data, error } = await supabaseAdmin
      .from("doctor_services")
      .insert([{ ...req.body, doctor_id: doctorId }])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ service: data });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to create service" });
  }
};

export const updateDoctorService = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = await getRole(userId);
    const { id } = req.params;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("doctor_services")
      .select("id, doctor_id")
      .eq("id", id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) return res.status(404).json({ error: "Service not found" });
    if (role !== "admin" && existing.doctor_id !== userId) {
      return res
        .status(403)
        .json({ error: "You can only update your own services" });
    }

    const updatePayload = { ...req.body, updated_at: new Date().toISOString() };
    delete (updatePayload as Record<string, any>).doctor_id;

    const { data, error } = await supabaseAdmin
      .from("doctor_services")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return res.json({ service: data });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to update service" });
  }
};

export const deleteDoctorService = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = await getRole(userId);
    const { id } = req.params;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("doctor_services")
      .select("id, doctor_id")
      .eq("id", id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) return res.status(404).json({ error: "Service not found" });
    if (role !== "admin" && existing.doctor_id !== userId) {
      return res
        .status(403)
        .json({ error: "You can only delete your own services" });
    }

    const { error } = await supabaseAdmin
      .from("doctor_services")
      .delete()
      .eq("id", id);
    if (error) throw error;

    return res.json({ message: "Service deleted" });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to delete service" });
  }
};

export const listServiceAvailability = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;

    const { data, error } = await supabaseAdmin
      .from("doctor_service_availability")
      .select("*")
      .eq("service_id", serviceId)
      .eq("is_active", true)
      .order("day_of_week", { ascending: true, nullsFirst: false })
      .order("specific_date", { ascending: true, nullsFirst: false })
      .order("start_time", { ascending: true });

    if (error) throw error;

    return res.json({ availability: data || [] });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to list availability" });
  }
};

export const createServiceAvailability = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const userId = req.user!.id;
    const role = await getRole(userId);
    const { serviceId } = req.params;

    const { data: service, error: serviceError } = await supabaseAdmin
      .from("doctor_services")
      .select("id, doctor_id")
      .eq("id", serviceId)
      .maybeSingle();

    if (serviceError) throw serviceError;
    if (!service) return res.status(404).json({ error: "Service not found" });
    if (role !== "admin" && service.doctor_id !== userId) {
      return res
        .status(403)
        .json({
          error: "You can only manage availability for your own services",
        });
    }

    const { data, error } = await supabaseAdmin
      .from("doctor_service_availability")
      .insert([
        { ...req.body, service_id: serviceId, doctor_id: service.doctor_id },
      ])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ availability: data });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to create availability" });
  }
};

export const updateServiceAvailability = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const userId = req.user!.id;
    const role = await getRole(userId);
    const { availabilityId } = req.params;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("doctor_service_availability")
      .select("id, doctor_id")
      .eq("id", availabilityId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing)
      return res.status(404).json({ error: "Availability not found" });
    if (role !== "admin" && existing.doctor_id !== userId) {
      return res
        .status(403)
        .json({ error: "You can only update your own availability" });
    }

    const updatePayload = { ...req.body, updated_at: new Date().toISOString() };
    delete (updatePayload as Record<string, any>).service_id;
    delete (updatePayload as Record<string, any>).doctor_id;

    const { data, error } = await supabaseAdmin
      .from("doctor_service_availability")
      .update(updatePayload)
      .eq("id", availabilityId)
      .select()
      .single();

    if (error) throw error;

    return res.json({ availability: data });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to update availability" });
  }
};

export const deleteServiceAvailability = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const userId = req.user!.id;
    const role = await getRole(userId);
    const { availabilityId } = req.params;

    const { data: existing, error: existingError } = await supabaseAdmin
      .from("doctor_service_availability")
      .select("id, doctor_id")
      .eq("id", availabilityId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing)
      return res.status(404).json({ error: "Availability not found" });
    if (role !== "admin" && existing.doctor_id !== userId) {
      return res
        .status(403)
        .json({ error: "You can only delete your own availability" });
    }

    const { error } = await supabaseAdmin
      .from("doctor_service_availability")
      .delete()
      .eq("id", availabilityId);

    if (error) throw error;

    return res.json({ message: "Availability deleted" });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to delete availability" });
  }
};
