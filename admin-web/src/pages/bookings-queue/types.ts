import { BookingQueueTab } from "../../stores/admin.store";

export type TabType = BookingQueueTab;

export type QueueAction =
  | "confirm"
  | "cancel"
  | "complete"
  | "no_show"
  | "payment_approve"
  | "payment_reject";
