import { Request, Response } from "express";
import { supabaseAdmin } from "../configs/supabase.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";
import { uploadFile } from "./upload.controller.js";

type ProfileRole = "mother" | "doctor" | "admin" | "counselor" | string;

const ACTIVE_BOOKING_STATUSES = [
  "pending_payment",
  "pending_confirmation",
  "confirmed",
];

const parsePagination = (query: Request["query"]) => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  return { page, from, to };
};

const getProfile = async (userId: string) => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as { id: string; role: ProfileRole };
};

const ensureBookingParticipantOrAdmin = async (
  bookingId: string,
  userId: string,
) => {
  const [{ data: booking, error: bookingError }, profile] = await Promise.all([
    supabaseAdmin
      .from("bookings")
      .select("id, mother_id, doctor_id")
      .eq("id", bookingId)
      .maybeSingle(),
    getProfile(userId),
  ]);

  if (bookingError) throw bookingError;
  if (!booking) return { ok: false, status: 404, error: "Booking not found" };
  if (!profile) return { ok: false, status: 403, error: "Profile not found" };

  const isParticipant =
    booking.mother_id === userId || booking.doctor_id === userId;
  const isAdmin = profile.role === "admin";
  if (!isParticipant && !isAdmin) {
    return {
      ok: false,
      status: 403,
      error: "You are not allowed to access this booking",
    };
  }

  return { ok: true, booking, profile };
};

const uploadBufferToCloudinary = async (
  file: Express.Multer.File,
  folder: string,
) => {
  const fakeReq = {
    file,
    body: { folder },
  } as unknown as Request;

  const result = await new Promise<any>((resolve, reject) => {
    try {
      (uploadFile as any)(fakeReq, {
        status: (_: number) => ({ json: (d: any) => resolve(d) }),
      } as any);
    } catch (e) {
      reject(e);
    }
  });

  return result?.result || null;
};

const checkAvailabilityWindow = (
  availability: any,
  scheduledStart: Date,
  scheduledEnd: Date,
) => {
  const day = scheduledStart.getUTCDay();
  const datePart = scheduledStart.toISOString().slice(0, 10);
  const startTime = scheduledStart.toISOString().slice(11, 19);
  const endTime = scheduledEnd.toISOString().slice(11, 19);

  if (availability.specific_date && availability.specific_date !== datePart) {
    return false;
  }
  if (
    availability.day_of_week !== null &&
    availability.day_of_week !== undefined &&
    Number(availability.day_of_week) !== day
  ) {
    return false;
  }

  return (
    startTime >= availability.start_time && endTime <= availability.end_time
  );
};

export const createBooking = async (req: AuthRequest, res: Response) => {
  try {
    const motherId = req.user!.id;
    const profile = await getProfile(motherId);
    if (!profile) return res.status(403).json({ error: "Profile not found" });
    if (profile.role !== "mother" && profile.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only mothers can create bookings" });
    }

    const {
      doctor_id,
      service_id,
      availability_id,
      payment_method,
      scheduled_start,
      scheduled_end,
      patient_age,
      symptoms,
      booking_notes,
    } = req.body;

    const scheduledStart = new Date(scheduled_start);
    const scheduledEnd = new Date(scheduled_end);

    if (scheduledEnd <= scheduledStart) {
      return res
        .status(400)
        .json({ error: "scheduled_end must be after scheduled_start" });
    }

    const { data: service, error: serviceError } = await supabaseAdmin
      .from("doctor_services")
      .select(
        "id, doctor_id, title, description, service_mode, price_amount, currency, is_active",
      )
      .eq("id", service_id)
      .maybeSingle();

    if (serviceError) throw serviceError;
    if (!service || !service.is_active) {
      return res.status(404).json({ error: "Service not found or inactive" });
    }

    if (doctor_id && service.doctor_id !== doctor_id) {
      return res
        .status(400)
        .json({ error: "Service does not belong to the selected doctor" });
    }

    if (payment_method === "cod" && service.service_mode !== "in_person") {
      return res
        .status(400)
        .json({ error: "COD is only allowed for in-person services" });
    }

    let resolvedAvailabilityId: string | null = null;
    if (availability_id) {
      const { data: availability, error: availabilityError } =
        await supabaseAdmin
          .from("doctor_service_availability")
          .select(
            "id, service_id, doctor_id, day_of_week, specific_date, start_time, end_time, is_active",
          )
          .eq("id", availability_id)
          .maybeSingle();

      if (availabilityError) throw availabilityError;
      if (!availability || !availability.is_active) {
        return res
          .status(404)
          .json({ error: "Availability slot not found or inactive" });
      }
      if (
        availability.service_id !== service.id ||
        availability.doctor_id !== service.doctor_id
      ) {
        return res
          .status(400)
          .json({ error: "Availability does not match the selected service" });
      }
      if (
        !checkAvailabilityWindow(availability, scheduledStart, scheduledEnd)
      ) {
        return res
          .status(400)
          .json({
            error: "Scheduled time is outside selected availability window",
          });
      }

      resolvedAvailabilityId = availability.id;
    }

    const { data: conflict, error: conflictError } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("doctor_id", service.doctor_id)
      .in("status", ACTIVE_BOOKING_STATUSES)
      .lt("scheduled_start", scheduled_end)
      .gt("scheduled_end", scheduled_start)
      .limit(1)
      .maybeSingle();

    if (conflictError) throw conflictError;
    if (conflict) {
      return res
        .status(409)
        .json({ error: "Selected time conflicts with another booking" });
    }

    const initialStatus =
      payment_method === "cod" ? "pending_confirmation" : "pending_payment";
    const initialPaymentStatus =
      payment_method === "cod" ? "unpaid" : "pending_review";

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert([
        {
          mother_id: motherId,
          doctor_id: service.doctor_id,
          service_id: service.id,
          availability_id: resolvedAvailabilityId,
          service_mode: service.service_mode,
          payment_method,
          status: initialStatus,
          payment_status: initialPaymentStatus,
          service_title_snapshot: service.title,
          service_description_snapshot: service.description,
          service_price_snapshot: service.price_amount,
          currency: service.currency || "ETB",
          scheduled_start,
          scheduled_end,
          patient_age: patient_age ?? null,
          symptoms: symptoms ?? null,
          booking_notes: booking_notes ?? null,
        },
      ])
      .select("*")
      .single();

    if (bookingError) throw bookingError;

    const { error: historyError } = await supabaseAdmin
      .from("booking_status_history")
      .insert([
        {
          booking_id: booking.id,
          actor_id: motherId,
          from_status: null,
          to_status: booking.status,
          note: "Booking created",
        },
      ]);
    if (historyError) {
      console.warn(
        "booking status history insert warning:",
        historyError.message,
      );
    }

    return res.status(201).json({ booking });
  } catch (err: any) {
    console.error("createBooking error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to create booking" });
  }
};

export const listMyBookings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { type, status, service_mode } = req.query;
    const { page, from, to } = parsePagination(req.query);
    const now = new Date().toISOString();

    let q = supabaseAdmin
      .from("bookings")
      .select("*", { count: "exact" })
      .eq("mother_id", userId)
      .range(from, to)
      .order("scheduled_start", { ascending: type === "upcoming" });

    if (type === "upcoming") q = q.gte("scheduled_start", now);
    if (type === "past") q = q.lt("scheduled_start", now);
    if (status) q = q.eq("status", String(status));
    if (service_mode) q = q.eq("service_mode", String(service_mode));

    const { data, error, count } = await q;
    if (error) throw error;

    return res.json({ bookings: data || [], page, total: count || 0 });
  } catch (err: any) {
    console.error("listMyBookings error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to list bookings" });
  }
};

export const listDoctorBookings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = await getProfile(userId);
    if (!profile) return res.status(403).json({ error: "Profile not found" });
    if (profile.role !== "doctor" && profile.role !== "admin") {
      return res.status(403).json({ error: "Doctor access required" });
    }

    const { type, status, service_mode } = req.query;
    const { page, from, to } = parsePagination(req.query);
    const now = new Date().toISOString();

    let q = supabaseAdmin
      .from("bookings")
      .select("*", { count: "exact" })
      .eq("doctor_id", userId)
      .range(from, to)
      .order("scheduled_start", { ascending: type === "upcoming" });

    if (type === "upcoming") q = q.gte("scheduled_start", now);
    if (type === "past") q = q.lt("scheduled_start", now);
    if (status) q = q.eq("status", String(status));
    if (service_mode) q = q.eq("service_mode", String(service_mode));

    const { data, error, count } = await q;
    if (error) throw error;

    return res.json({ bookings: data || [], page, total: count || 0 });
  } catch (err: any) {
    console.error("listDoctorBookings error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to list doctor bookings" });
  }
};

export const getBooking = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const access = await ensureBookingParticipantOrAdmin(id, userId);
    if (!access.ok) {
      return res.status(access.status || 403).json({ error: access.error });
    }

    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select(
        `
        *,
        booking_documents(*),
        booking_payments(*),
        booking_status_history(*)
      `,
      )
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Booking not found" });

    return res.json({ booking: data });
  } catch (err: any) {
    console.error("getBooking error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to fetch booking" });
  }
};

export const addBookingDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const access = await ensureBookingParticipantOrAdmin(id, userId);
    if (!access.ok) {
      return res.status(access.status || 403).json({ error: access.error });
    }

    const documentType = req.body.document_type || "other";
    const metadata = req.body.metadata || {};
    const rows: Array<Record<string, any>> = [];

    const files = req.files as Express.Multer.File[] | undefined;
    if (files && files.length) {
      for (const file of files) {
        const uploaded = await uploadBufferToCloudinary(
          file,
          `bellytalk/bookings/${id}`,
        );
        if (uploaded?.secure_url) {
          rows.push({
            booking_id: id,
            uploaded_by: userId,
            document_type: documentType,
            file_url: uploaded.secure_url,
            file_name: file.originalname,
            metadata,
          });
        }
      }
    }

    if (req.body.urls) {
      const urlEntries =
        typeof req.body.urls === "string"
          ? JSON.parse(req.body.urls)
          : req.body.urls;
      if (Array.isArray(urlEntries)) {
        for (const item of urlEntries) {
          if (!item?.file_url) continue;
          rows.push({
            booking_id: id,
            uploaded_by: userId,
            document_type: item.document_type || documentType,
            file_url: item.file_url,
            file_name: item.file_name || null,
            metadata,
          });
        }
      }
    }

    if (!rows.length) {
      return res.status(400).json({
        error: "No documents provided. Upload files or pass urls array",
      });
    }

    const { data, error } = await supabaseAdmin
      .from("booking_documents")
      .insert(rows)
      .select("*");

    if (error) throw error;

    return res.status(201).json({ documents: data || [] });
  } catch (err: any) {
    console.error("addBookingDocuments error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to add documents" });
  }
};

export const submitBookingPayment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const {
      payment_method,
      amount,
      currency = "ETB",
      transaction_reference,
      proof_document_id,
      metadata,
    } = req.body;

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, mother_id, doctor_id, service_mode, payment_method, status, payment_status",
      )
      .eq("id", id)
      .maybeSingle();

    if (bookingError) throw bookingError;
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.mother_id !== userId) {
      return res
        .status(403)
        .json({ error: "Only the booking owner can submit payment" });
    }

    if (payment_method !== booking.payment_method) {
      return res
        .status(400)
        .json({ error: "Payment method must match booking payment_method" });
    }

    if (payment_method === "cod" && booking.service_mode !== "in_person") {
      return res
        .status(400)
        .json({ error: "COD is only allowed for in-person services" });
    }

    if (payment_method === "proof_upload" && !proof_document_id) {
      return res
        .status(400)
        .json({ error: "proof_document_id is required for proof_upload" });
    }

    const paymentStatus =
      payment_method === "proof_upload" ? "pending_review" : "approved";
    const bookingPaymentStatus =
      payment_method === "proof_upload" ? "pending_review" : "unpaid";
    const bookingStatus =
      payment_method === "proof_upload"
        ? "pending_payment"
        : "pending_confirmation";

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("booking_payments")
      .insert([
        {
          booking_id: id,
          submitted_by: userId,
          payment_method,
          amount,
          currency,
          status: paymentStatus,
          proof_document_id: proof_document_id || null,
          transaction_reference: transaction_reference || null,
          metadata: metadata || {},
        },
      ])
      .select("*")
      .single();

    if (paymentError) throw paymentError;

    const { data: updatedBooking, error: bookingUpdateError } =
      await supabaseAdmin
        .from("bookings")
        .update({
          payment_status: bookingPaymentStatus,
          status: bookingStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

    if (bookingUpdateError) throw bookingUpdateError;

    await supabaseAdmin.from("booking_status_history").insert([
      {
        booking_id: id,
        actor_id: userId,
        from_status: booking.status,
        to_status: updatedBooking.status,
        note: "Payment submitted",
      },
    ]);

    return res.status(201).json({ payment, booking: updatedBooking });
  } catch (err: any) {
    console.error("submitBookingPayment error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to submit payment" });
  }
};

export const reviewBookingPayment = async (req: AuthRequest, res: Response) => {
  try {
    const reviewerId = req.user!.id;
    const { id, paymentId } = req.params;
    const { status, rejection_reason } = req.body;

    const profile = await getProfile(reviewerId);
    if (!profile) return res.status(403).json({ error: "Profile not found" });
    if (profile.role !== "doctor" && profile.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only doctor/admin can review payments" });
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("id, doctor_id, status")
      .eq("id", id)
      .maybeSingle();

    if (bookingError) throw bookingError;
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (profile.role !== "admin" && booking.doctor_id !== reviewerId) {
      return res
        .status(403)
        .json({ error: "Only assigned doctor can review this payment" });
    }

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("booking_payments")
      .update({
        status,
        rejection_reason:
          status === "rejected" ? rejection_reason || null : null,
        reviewer_id: reviewerId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId)
      .eq("booking_id", id)
      .select("*")
      .maybeSingle();

    if (paymentError) throw paymentError;
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    const nextBookingStatus =
      status === "approved" ? "pending_confirmation" : "pending_payment";
    const nextPaymentStatus = status === "approved" ? "paid" : "rejected";

    const { data: updatedBooking, error: updateBookingError } =
      await supabaseAdmin
        .from("bookings")
        .update({
          status: nextBookingStatus,
          payment_status: nextPaymentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single();

    if (updateBookingError) throw updateBookingError;

    await supabaseAdmin.from("booking_status_history").insert([
      {
        booking_id: id,
        actor_id: reviewerId,
        from_status: booking.status,
        to_status: updatedBooking.status,
        note: status === "approved" ? "Payment approved" : "Payment rejected",
      },
    ]);

    return res.json({ payment, booking: updatedBooking });
  } catch (err: any) {
    console.error("reviewBookingPayment error:", err);
    return res
      .status(500)
      .json({ error: err.message || "Failed to review payment" });
  }
};
