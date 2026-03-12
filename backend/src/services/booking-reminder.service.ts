import { supabaseAdmin } from "../configs/supabase.js";
import { sendMail } from "./email.service.js";

type ReminderType = "reminder_24h" | "reminder_1h";
type ReminderRow = {
  id: string;
  status: "processing" | "sent" | "failed";
  retry_count: number;
  next_retry_at: string | null;
  updated_at: string;
};

let intervalHandle: NodeJS.Timeout | null = null;
let isRunning = false;
const WORKER_LOCK_NAME = "booking_reminder_worker";
const WORKER_OWNER_ID = `worker-${process.pid}-${Math.random()
  .toString(36)
  .slice(2, 8)}`;

const WINDOW_MINUTES: Record<ReminderType, number> = {
  reminder_24h: 24 * 60,
  reminder_1h: 60,
};

const TOLERANCE_MINUTES: Record<ReminderType, number> = {
  reminder_24h: 10,
  reminder_1h: 5,
};

const reminderSubject = (type: ReminderType) =>
  type === "reminder_24h"
    ? "Reminder: Booking in 24 hours - BellyTalk"
    : "Reminder: Booking in 1 hour - BellyTalk";

const reminderLabel = (type: ReminderType) =>
  type === "reminder_24h" ? "24 hours" : "1 hour";

const getLockTtlMs = () =>
  Number(process.env.BOOKING_REMINDER_LOCK_TTL_MS || 120000);
const getProcessingTimeoutMs = () =>
  Number(process.env.BOOKING_REMINDER_PROCESSING_TIMEOUT_MS || 900000);
const getMaxRetries = () =>
  Number(process.env.BOOKING_REMINDER_MAX_RETRIES || 5);
const getBackoffBaseMinutes = () =>
  Number(process.env.BOOKING_REMINDER_RETRY_BASE_MINUTES || 5);

const calculateNextRetryAt = (attemptNumber: number) => {
  const base = getBackoffBaseMinutes();
  const backoffMinutes = Math.min(
    base * 2 ** Math.max(0, attemptNumber - 1),
    360,
  );
  return new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();
};

const shouldSendReminder = (
  scheduledStart: string,
  reminderType: ReminderType,
  now: Date,
) => {
  const targetMinutes = WINDOW_MINUTES[reminderType];
  const tolerance = TOLERANCE_MINUTES[reminderType];
  const diffMinutes =
    (new Date(scheduledStart).getTime() - now.getTime()) / (60 * 1000);

  return (
    diffMinutes >= targetMinutes - tolerance &&
    diffMinutes <= targetMinutes + tolerance
  );
};

const acquireDistributedWorkerLock = async () => {
  const now = new Date();
  const lockExpiry = new Date(now.getTime() + getLockTtlMs()).toISOString();
  const nowIso = now.toISOString();

  const { data, error } = await supabaseAdmin
    .from("worker_locks")
    .insert([
      {
        lock_name: WORKER_LOCK_NAME,
        owner_id: WORKER_OWNER_ID,
        expires_at: lockExpiry,
      },
    ])
    .select("lock_name")
    .maybeSingle();

  if (!error && data) return true;

  if (error) {
    if (error.code !== "23505") throw error;

    const { data: takeover, error: takeoverError } = await supabaseAdmin
      .from("worker_locks")
      .update({
        owner_id: WORKER_OWNER_ID,
        expires_at: lockExpiry,
        updated_at: nowIso,
      })
      .eq("lock_name", WORKER_LOCK_NAME)
      .lt("expires_at", nowIso)
      .select("lock_name")
      .maybeSingle();

    if (takeoverError) throw takeoverError;
    return Boolean(takeover);
  }

  return false;
};

const releaseDistributedWorkerLock = async () => {
  const { error } = await supabaseAdmin
    .from("worker_locks")
    .delete()
    .eq("lock_name", WORKER_LOCK_NAME)
    .eq("owner_id", WORKER_OWNER_ID);

  if (error) {
    console.warn("[booking-reminder] release lock warning:", error.message);
  }
};

const reserveReminderSlot = async (
  booking: any,
  reminderType: ReminderType,
  now: Date,
) => {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("booking_reminders")
    .select("id, status, retry_count, next_retry_at, updated_at")
    .eq("booking_id", booking.id)
    .eq("reminder_type", reminderType)
    .maybeSingle<ReminderRow>();

  if (existingError) throw existingError;

  if (!existing) {
    if (!shouldSendReminder(booking.scheduled_start, reminderType, now)) {
      return null;
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("booking_reminders")
      .insert([
        {
          booking_id: booking.id,
          reminder_type: reminderType,
          status: "processing",
        },
      ])
      .select("id, retry_count")
      .maybeSingle();

    if (insertError) {
      if (insertError.code === "23505") return null;
      throw insertError;
    }

    return inserted || null;
  }

  if (existing.status === "sent") return null;

  if (existing.status === "failed") {
    if (existing.retry_count >= getMaxRetries()) return null;
    if (existing.next_retry_at && new Date(existing.next_retry_at) > now) {
      return null;
    }

    const { data: claimed, error: claimError } = await supabaseAdmin
      .from("booking_reminders")
      .update({
        status: "processing",
        updated_at: now.toISOString(),
      })
      .eq("id", existing.id)
      .eq("status", "failed")
      .select("id, retry_count")
      .maybeSingle();

    if (claimError) throw claimError;
    return claimed || null;
  }

  const staleCutoff = new Date(
    now.getTime() - getProcessingTimeoutMs(),
  ).toISOString();
  if (existing.status === "processing" && existing.updated_at < staleCutoff) {
    const { data: reclaimed, error: reclaimError } = await supabaseAdmin
      .from("booking_reminders")
      .update({
        updated_at: now.toISOString(),
      })
      .eq("id", existing.id)
      .eq("status", "processing")
      .lt("updated_at", staleCutoff)
      .select("id, retry_count")
      .maybeSingle();

    if (reclaimError) throw reclaimError;
    return reclaimed || null;
  }

  return null;
};

const updateReminderSent = async (reminderId: string) => {
  const { error } = await supabaseAdmin
    .from("booking_reminders")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      last_error: null,
      next_retry_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reminderId);

  if (error) {
    console.warn("booking reminder sent update warning:", error.message);
  }
};

const updateReminderFailed = async (
  reminderId: string,
  currentRetryCount: number,
  lastError?: string,
) => {
  const nextRetryCount = currentRetryCount + 1;
  const nextRetryAt = calculateNextRetryAt(nextRetryCount);

  const { error } = await supabaseAdmin
    .from("booking_reminders")
    .update({
      status: "failed",
      retry_count: nextRetryCount,
      next_retry_at: nextRetryAt,
      last_error: lastError || "Unknown error",
      updated_at: new Date().toISOString(),
    })
    .eq("id", reminderId);

  if (error) {
    console.warn("booking reminder failed update warning:", error.message);
  }
};

const sendReminderForBooking = async (
  booking: any,
  reminderType: ReminderType,
  now: Date,
) => {
  const reminderSlot = await reserveReminderSlot(booking, reminderType, now);
  if (!reminderSlot?.id) return;

  try {
    const { data: users } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .in("id", [booking.mother_id, booking.doctor_id]);

    const mother = (users || []).find((u: any) => u.id === booking.mother_id);
    const doctor = (users || []).find((u: any) => u.id === booking.doctor_id);
    const recipients = [mother?.email, doctor?.email].filter(
      Boolean,
    ) as string[];

    if (!recipients.length) {
      await updateReminderFailed(
        reminderSlot.id,
        reminderSlot.retry_count || 0,
        "No recipients found",
      );
      return;
    }

    const label = reminderLabel(reminderType);
    const scheduledStart = new Date(booking.scheduled_start).toISOString();
    const html = `<p>Hello,</p><p>This is a reminder that your BellyTalk booking is in <strong>${label}</strong>.</p><p>Start time: ${scheduledStart}</p>`;

    for (const to of recipients) {
      await sendMail(to, reminderSubject(reminderType), html);
    }

    await updateReminderSent(reminderSlot.id);
    console.info(
      `[booking-reminder] sent ${reminderType} booking=${booking.id}`,
    );
  } catch (error: any) {
    console.error("[booking-reminder] send failed:", error);
    await updateReminderFailed(
      reminderSlot.id,
      reminderSlot.retry_count || 0,
      error?.message,
    );
  }
};

export const runBookingReminderCycle = async () => {
  if (isRunning) return;
  let lockAcquired = false;

  try {
    lockAcquired = await acquireDistributedWorkerLock();
    if (!lockAcquired) return;

    isRunning = true;
    const now = new Date();
    const windowEnd = new Date(now.getTime() + (24 * 60 + 15) * 60 * 1000);

    const { data: bookings, error } = await supabaseAdmin
      .from("bookings")
      .select("id, mother_id, doctor_id, scheduled_start, status")
      .eq("status", "confirmed")
      .gte("scheduled_start", now.toISOString())
      .lte("scheduled_start", windowEnd.toISOString())
      .order("scheduled_start", { ascending: true });

    if (error) throw error;

    for (const booking of bookings || []) {
      await sendReminderForBooking(booking, "reminder_24h", now);
      await sendReminderForBooking(booking, "reminder_1h", now);
    }
  } catch (error) {
    console.error("[booking-reminder] cycle failed:", error);
  } finally {
    isRunning = false;
    if (lockAcquired) {
      await releaseDistributedWorkerLock();
    }
  }
};

export const startBookingReminderWorker = () => {
  const explicitEnv = process.env.BOOKING_REMINDER_ENABLED;
  const enabled =
    explicitEnv !== undefined
      ? String(explicitEnv).toLowerCase() !== "false"
      : process.env.NODE_ENV === "production";

  if (!enabled) {
    console.info(
      "[booking-reminder] disabled (set BOOKING_REMINDER_ENABLED=true to run it)",
    );
    return;
  }

  const intervalMs = Number(process.env.BOOKING_REMINDER_INTERVAL_MS || 60000);

  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }

  runBookingReminderCycle().catch((error) => {
    console.error("[booking-reminder] startup cycle failed:", error);
  });
  intervalHandle = setInterval(() => {
    runBookingReminderCycle().catch((error) => {
      console.error("[booking-reminder] interval cycle failed:", error);
    });
  }, intervalMs);

  console.info(`[booking-reminder] worker started interval=${intervalMs}ms`);
};
