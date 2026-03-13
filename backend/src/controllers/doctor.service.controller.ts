import { Request, Response } from "express";
import { supabaseAdmin } from "../configs/supabase.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { DateTime } from "luxon";

type ProfileRole = "mother" | "doctor" | "admin" | "counselor" | string;

interface ProfileAuthMeta {
  role: ProfileRole;
  role_status?: string | null;
  doctor_verification_status?: string | null;
}

const getRole = async (userId: string): Promise<ProfileRole | null> => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data.role as ProfileRole;
};

const getProfileAuthMeta = async (
  userId: string,
): Promise<ProfileAuthMeta | null> => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role, role_status")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    role: data.role as ProfileRole,
    role_status: data.role_status,
  };
};

const getDoctorVerificationStatus = async (
  userId: string,
): Promise<string | null> => {
  const { data, error } = await supabaseAdmin
    .from("doctor_profiles")
    .select("verification_status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data.verification_status || null;
};

const ensureDoctorApprovedOrAdmin = async (userId: string) => {
  const meta = await getProfileAuthMeta(userId);
  if (!meta) {
    return { ok: false, status: 403, error: "Profile not found" };
  }

  if (meta.role === "admin") {
    return { ok: true };
  }

  if (meta.role !== "doctor") {
    return { ok: false, status: 403, error: "Doctor access required" };
  }

  if (meta.role_status !== "approved") {
    return {
      ok: false,
      status: 403,
      error:
        "Your doctor profile is pending approval. You cannot manage services yet.",
    };
  }

  const doctorVerificationStatus = await getDoctorVerificationStatus(userId);
  if (doctorVerificationStatus !== "approved") {
    return {
      ok: false,
      status: 403,
      error:
        "Your doctor verification is pending. You cannot manage services yet.",
    };
  }

  return { ok: true };
};

const parsePagination = (query: Request["query"]) => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { page, limit, from, to };
};

const ACTIVE_BOOKING_STATUSES = [
  "pending_payment",
  "pending_confirmation",
  "confirmed",
];

const parseTimeToMinutes = (time: string) => {
  const [hoursStr, minutesStr] = String(time).split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
};

const buildUtcIsoFromDateAndMinutes = (dateYmd: string, minutes: number, timezone: string) => {
  const [yearStr, monthStr, dayStr] = dateYmd.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return DateTime.fromObject(
    { year, month, day, hour: hours, minute: mins, second: 0 },
    { zone: timezone }
  ).toUTC().toISO()!;
};

const getUpcomingDateStringsByWeekday = (
  dayOfWeek: number,
  lookaheadDays: number,
  timezone: string
) => {
  const results: string[] = [];
  const now = DateTime.now().setZone(timezone);

  for (let offset = 0; offset <= lookaheadDays; offset += 1) {
    const candidate = now.plus({ days: offset });
    // luxon 1=Monday, 7=Sunday vs JS 0=Sunday, 1=Monday
    const candDayOfWeek = candidate.weekday === 7 ? 0 : candidate.weekday;
    if (candDayOfWeek === dayOfWeek) {
      results.push(candidate.toISODate()!);
    }
  }

  return results;
};

const bookingOverlaps = (
  slotStartIso: string,
  slotEndIso: string,
  booking: { scheduled_start: string; scheduled_end: string },
) => {
  return (
    slotStartIso < String(booking.scheduled_end) &&
    slotEndIso > String(booking.scheduled_start)
  );
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
    const approvalCheck = await ensureDoctorApprovedOrAdmin(userId);
    if (!approvalCheck.ok) {
      return res
        .status(approvalCheck.status || 403)
        .json({ error: approvalCheck.error });
    }

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
    const approvalCheck = await ensureDoctorApprovedOrAdmin(userId);
    if (!approvalCheck.ok) {
      return res
        .status(approvalCheck.status || 403)
        .json({ error: approvalCheck.error });
    }

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
    const approvalCheck = await ensureDoctorApprovedOrAdmin(userId);
    if (!approvalCheck.ok) {
      return res
        .status(approvalCheck.status || 403)
        .json({ error: approvalCheck.error });
    }

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

export const listServiceSlots = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;
    const lookaheadDays = Number(req.query.lookahead_days || 21);
    const now = new Date();
    const nowIso = now.toISOString();

    const { data: service, error: serviceError } = await supabaseAdmin
      .from("doctor_services")
      .select(
        "id, doctor_id, duration_minutes, booking_buffer_minutes, is_active",
      )
      .eq("id", serviceId)
      .maybeSingle();

    if (serviceError) throw serviceError;
    if (!service || !service.is_active) {
      return res.status(404).json({ error: "Service not found or inactive" });
    }

    const { data: availabilityRows, error: availabilityError } =
      await supabaseAdmin
        .from("doctor_service_availability")
        .select(
          "id, service_id, doctor_id, day_of_week, specific_date, start_time, end_time, timezone, slot_capacity, is_active",
        )
        .eq("service_id", serviceId)
        .eq("is_active", true)
        .order("day_of_week", { ascending: true, nullsFirst: false })
        .order("specific_date", { ascending: true, nullsFirst: false })
        .order("start_time", { ascending: true });

    if (availabilityError) throw availabilityError;

    const horizon = new Date(now);
    horizon.setUTCDate(horizon.getUTCDate() + lookaheadDays + 1);

    const { data: activeBookings, error: bookingsError } = await supabaseAdmin
      .from("bookings")
      .select("id, scheduled_start, scheduled_end")
      .eq("doctor_id", service.doctor_id)
      .in("status", ACTIVE_BOOKING_STATUSES)
      .gte("scheduled_end", nowIso)
      .lte("scheduled_start", horizon.toISOString());

    if (bookingsError) throw bookingsError;

    const duration = Number(service.duration_minutes || 0);
    const buffer = Number(service.booking_buffer_minutes || 0);
    const step = Math.max(duration + buffer, 1);

    const slots: Array<{
      slot_key: string;
      availability_id: string;
      service_id: string;
      doctor_id: string;
      start_at: string;
      end_at: string;
      timezone: string;
      slot_capacity: number;
      booked_count: number;
      remaining: number;
    }> = [];

    for (const availability of availabilityRows || []) {
      const startMinutes = parseTimeToMinutes(availability.start_time);
      const endMinutes = parseTimeToMinutes(availability.end_time);
      if (startMinutes === null || endMinutes === null || duration <= 0) {
        continue;
      }

      const tz = String(availability.timezone || "UTC");

      const dates: string[] = [];
      if (availability.specific_date) {
        dates.push(String(availability.specific_date));
      } else if (typeof availability.day_of_week === "number") {
        dates.push(
          ...getUpcomingDateStringsByWeekday(
            Number(availability.day_of_week),
            lookaheadDays,
            tz
          ),
        );
      }

      for (const dateYmd of dates) {
        for (
          let cursor = startMinutes;
          cursor + duration <= endMinutes;
          cursor += step
        ) {
          const startIso = buildUtcIsoFromDateAndMinutes(dateYmd, cursor, tz);
          const endIso = buildUtcIsoFromDateAndMinutes(
            dateYmd,
            cursor + duration,
            tz
          );

          if (new Date(startIso).getTime() <= now.getTime()) {
            continue;
          }

          const overlaps = (activeBookings || []).filter((booking) =>
            bookingOverlaps(startIso, endIso, {
              scheduled_start: booking.scheduled_start,
              scheduled_end: booking.scheduled_end,
            }),
          );

          const capacity = Number(availability.slot_capacity || 1);
          const bookedCount = overlaps.length;
          const remaining = Math.max(capacity - bookedCount, 0);

          slots.push({
            slot_key: `${availability.id}__${startIso}`,
            availability_id: availability.id,
            service_id: serviceId,
            doctor_id: service.doctor_id,
            start_at: startIso,
            end_at: endIso,
            timezone: String(availability.timezone || "UTC"),
            slot_capacity: capacity,
            booked_count: bookedCount,
            remaining,
          });
        }
      }
    }

    const availableSlots = slots
      .filter((slot) => slot.remaining > 0)
      .sort((a, b) => a.start_at.localeCompare(b.start_at));

    return res.json({
      slots: availableSlots,
      lookahead_days: lookaheadDays,
      generated_at: nowIso,
    });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err.message || "Failed to list slots" });
  }
};

export const createServiceAvailability = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const userId = req.user!.id;
    const approvalCheck = await ensureDoctorApprovedOrAdmin(userId);
    if (!approvalCheck.ok) {
      return res
        .status(approvalCheck.status || 403)
        .json({ error: approvalCheck.error });
    }

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
      return res.status(403).json({
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
    const approvalCheck = await ensureDoctorApprovedOrAdmin(userId);
    if (!approvalCheck.ok) {
      return res
        .status(approvalCheck.status || 403)
        .json({ error: approvalCheck.error });
    }

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
    const approvalCheck = await ensureDoctorApprovedOrAdmin(userId);
    if (!approvalCheck.ok) {
      return res
        .status(approvalCheck.status || 403)
        .json({ error: approvalCheck.error });
    }

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
