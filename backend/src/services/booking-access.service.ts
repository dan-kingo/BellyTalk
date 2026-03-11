import { supabaseAdmin } from "../configs/supabase.js";

type Channel = "message" | "audio" | "video";
type Role = "mother" | "doctor" | "admin" | string;

interface InteractionCheckInput {
  actorId: string;
  peerId: string;
  channel: Channel;
  bookingId?: string;
}

interface InteractionCheckResult {
  ok: boolean;
  status: number;
  error?: string;
  code?: string;
  booking?: any;
}

const CALL_TIME_GRACE_BEFORE_MS = 15 * 60 * 1000;
const CALL_TIME_GRACE_AFTER_MS = 30 * 60 * 1000;

const getUserRole = async (userId: string): Promise<Role | null> => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data.role as Role;
};

const hasAllowedServiceMode = (serviceMode: string, channel: Channel) => {
  if (channel === "message") return serviceMode === "message";
  if (channel === "audio") return serviceMode === "audio";
  if (channel === "video") return serviceMode === "video";
  return false;
};

const isCallWindowOpen = (scheduledStart: string, scheduledEnd: string) => {
  const now = Date.now();
  const start = new Date(scheduledStart).getTime() - CALL_TIME_GRACE_BEFORE_MS;
  const end = new Date(scheduledEnd).getTime() + CALL_TIME_GRACE_AFTER_MS;
  return now >= start && now <= end;
};

export const checkDirectInteractionAccess = async (
  input: InteractionCheckInput,
): Promise<InteractionCheckResult> => {
  const { actorId, peerId, channel, bookingId } = input;

  if (!actorId || !peerId) {
    return {
      ok: false,
      status: 400,
      error: "Both participants are required",
      code: "PARTICIPANTS_REQUIRED",
    };
  }
  if (actorId === peerId) {
    return {
      ok: false,
      status: 400,
      error: "Cannot start interaction with yourself",
      code: "SELF_INTERACTION_NOT_ALLOWED",
    };
  }

  const [actorRole, peerRole] = await Promise.all([
    getUserRole(actorId),
    getUserRole(peerId),
  ]);

  if (!actorRole || !peerRole) {
    return {
      ok: false,
      status: 404,
      error: "Participant profile not found",
      code: "PARTICIPANT_PROFILE_NOT_FOUND",
    };
  }

  const isMotherMother = actorRole === "mother" && peerRole === "mother";
  const isMotherDoctor =
    (actorRole === "mother" && peerRole === "doctor") ||
    (actorRole === "doctor" && peerRole === "mother");

  if (isMotherMother) {
    if (channel === "message") return { ok: true, status: 200 };
    return {
      ok: false,
      status: 403,
      error: "Mother-to-mother audio/video calls are not allowed",
      code: "MOTHER_TO_MOTHER_CALL_NOT_ALLOWED",
    };
  }

  if (!isMotherDoctor) {
    return {
      ok: false,
      status: 403,
      error: "This interaction type is not allowed",
      code: "INTERACTION_NOT_ALLOWED",
    };
  }

  if (!bookingId) {
    return {
      ok: false,
      status: 400,
      error: "booking_id is required for mother-doctor interactions",
      code: "BOOKING_ID_REQUIRED",
    };
  }

  const { data: booking, error: bookingError } = await supabaseAdmin
    .from("bookings")
    .select(
      "id, mother_id, doctor_id, service_mode, status, payment_status, scheduled_start, scheduled_end",
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError) {
    return {
      ok: false,
      status: 500,
      error: bookingError.message,
      code: "BOOKING_LOOKUP_FAILED",
    };
  }
  if (!booking) {
    return {
      ok: false,
      status: 404,
      error: "Booking not found",
      code: "BOOKING_NOT_FOUND",
    };
  }

  const actorInBooking =
    booking.mother_id === actorId || booking.doctor_id === actorId;
  const peerInBooking =
    booking.mother_id === peerId || booking.doctor_id === peerId;

  if (!actorInBooking || !peerInBooking) {
    return {
      ok: false,
      status: 403,
      error: "Participants do not match booking participants",
      code: "BOOKING_PARTICIPANT_MISMATCH",
    };
  }

  if (["cancelled", "expired", "no_show"].includes(booking.status)) {
    return {
      ok: false,
      status: 403,
      error: "Booking is not active for interaction",
      code: "BOOKING_NOT_ACTIVE",
    };
  }

  if (!hasAllowedServiceMode(booking.service_mode, channel)) {
    return {
      ok: false,
      status: 403,
      error: `Booking service mode '${booking.service_mode}' does not allow ${channel}`,
      code: "SERVICE_MODE_NOT_ALLOWED",
    };
  }

  if (
    (channel === "audio" || channel === "video") &&
    !isCallWindowOpen(booking.scheduled_start, booking.scheduled_end)
  ) {
    return {
      ok: false,
      status: 403,
      error: "Call can only be started around the booked time window",
      code: "CALL_WINDOW_CLOSED",
    };
  }

  return { ok: true, status: 200, booking };
};
