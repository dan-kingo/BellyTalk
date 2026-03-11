import { supabaseAdmin } from "../configs/supabase.js";
import { sendMail } from "./email.service.js";

type ReminderType = "reminder_24h" | "reminder_1h";

let intervalHandle: NodeJS.Timeout | null = null;
let isRunning = false;

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

const reserveReminderSlot = async (
  bookingId: string,
  reminderType: ReminderType,
) => {
  const { data, error } = await supabaseAdmin
    .from("booking_reminders")
    .insert([
      {
        booking_id: bookingId,
        reminder_type: reminderType,
        status: "processing",
      },
    ])
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return null;
    throw error;
  }

  return data?.id || null;
};

const updateReminderResult = async (
  reminderId: string,
  status: "sent" | "failed",
  lastError?: string,
) => {
  const updateData: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "sent") {
    updateData.sent_at = new Date().toISOString();
    updateData.last_error = null;
  } else {
    updateData.last_error = lastError || "Unknown error";
  }

  const { error } = await supabaseAdmin
    .from("booking_reminders")
    .update(updateData)
    .eq("id", reminderId);

  if (error) {
    console.warn("booking reminder update warning:", error.message);
  }
};

const sendReminderForBooking = async (
  booking: any,
  reminderType: ReminderType,
  now: Date,
) => {
  if (!shouldSendReminder(booking.scheduled_start, reminderType, now)) return;

  const reminderId = await reserveReminderSlot(booking.id, reminderType);
  if (!reminderId) return;

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
      await updateReminderResult(reminderId, "failed", "No recipients found");
      return;
    }

    const label = reminderLabel(reminderType);
    const scheduledStart = new Date(booking.scheduled_start).toISOString();
    const html = `<p>Hello,</p><p>This is a reminder that your BellyTalk booking is in <strong>${label}</strong>.</p><p>Start time: ${scheduledStart}</p>`;

    for (const to of recipients) {
      await sendMail(to, reminderSubject(reminderType), html);
    }

    await updateReminderResult(reminderId, "sent");
    console.info(
      `[booking-reminder] sent ${reminderType} for booking=${booking.id}`,
    );
  } catch (error: any) {
    console.error("[booking-reminder] send failed:", error);
    await updateReminderResult(reminderId, "failed", error?.message);
  }
};

export const runBookingReminderCycle = async () => {
  if (isRunning) return;
  isRunning = true;

  try {
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
  }
};

export const startBookingReminderWorker = () => {
  const enabled =
    String(process.env.BOOKING_REMINDER_ENABLED || "true").toLowerCase() !==
    "false";

  if (!enabled) {
    console.info("[booking-reminder] disabled by BOOKING_REMINDER_ENABLED");
    return;
  }

  const intervalMs = Number(process.env.BOOKING_REMINDER_INTERVAL_MS || 60000);

  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }

  runBookingReminderCycle();
  intervalHandle = setInterval(() => {
    runBookingReminderCycle();
  }, intervalMs);

  console.info(`[booking-reminder] worker started interval=${intervalMs}ms`);
};
