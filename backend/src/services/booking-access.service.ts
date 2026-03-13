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

  // Doctor-mother pair is verified above — allow the call unconditionally.
  return { ok: true, status: 200 };
};
