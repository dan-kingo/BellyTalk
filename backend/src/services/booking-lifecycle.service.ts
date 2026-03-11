export type BookingStatus =
  | "pending_payment"
  | "pending_confirmation"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show"
  | "expired";

export type BookingTransitionAction =
  | "confirm"
  | "cancel"
  | "complete"
  | "reschedule"
  | "no_show"
  | "payment_review_approved"
  | "payment_review_rejected";

const TRANSITION_RULES: Record<BookingTransitionAction, BookingStatus[]> = {
  confirm: ["pending_confirmation", "pending_payment"],
  cancel: ["pending_payment", "pending_confirmation", "confirmed"],
  complete: ["confirmed"],
  reschedule: ["pending_payment", "pending_confirmation", "confirmed"],
  no_show: ["confirmed"],
  payment_review_approved: ["pending_payment"],
  payment_review_rejected: ["pending_payment", "pending_confirmation"],
};

export const ensureBookingTransitionAllowed = (
  action: BookingTransitionAction,
  fromStatus: string,
) => {
  const allowed = TRANSITION_RULES[action].includes(
    fromStatus as BookingStatus,
  );

  if (allowed) {
    return { ok: true as const };
  }

  return {
    ok: false as const,
    status: 409,
    code: "BOOKING_INVALID_TRANSITION",
    error: `Cannot ${action.replace("_", " ")} from status '${fromStatus}'`,
  };
};
