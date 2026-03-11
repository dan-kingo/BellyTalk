import React from "react";
import { AdminBookingQueueItem } from "../../types";
import { QueueAction, TabType } from "./types";

interface BookingQueueCardProps {
  booking: AdminBookingQueueItem;
  tab: TabType;
  onAction: (booking: AdminBookingQueueItem, action: QueueAction) => void;
}

const BookingQueueCard: React.FC<BookingQueueCardProps> = ({
  booking,
  tab,
  onAction,
}) => {
  const actionButtons =
    tab === "pending-confirmations"
      ? [
          {
            label: "Confirm",
            action: "confirm" as const,
            className: "bg-green-600 text-white",
          },
          {
            label: "Cancel",
            action: "cancel" as const,
            className: "bg-red-600 text-white",
          },
        ]
      : tab === "pending-payment"
        ? [
            {
              label: "Approve Payment",
              action: "payment_approve" as const,
              className: "bg-green-600 text-white",
            },
            {
              label: "Reject Payment",
              action: "payment_reject" as const,
              className: "bg-red-600 text-white",
            },
          ]
        : [
            {
              label: "Complete",
              action: "complete" as const,
              className: "bg-blue-600 text-white",
            },
            {
              label: "No-Show",
              action: "no_show" as const,
              className: "bg-amber-600 text-white",
            },
          ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            #{booking.id}
          </p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {booking.mother_profile?.full_name || booking.mother_id}
            {" -> "}
            {booking.doctor_profile?.full_name || booking.doctor_id}
          </p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Status: {booking.status} | Payment: {booking.payment_status || "-"}
            {" | "}
            Mode: {booking.service_mode || "-"}
          </p>
          {booking.scheduled_start && (
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Scheduled: {new Date(booking.scheduled_start).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {actionButtons.map((actionButton) => (
            <button
              key={actionButton.action}
              type="button"
              onClick={() => onAction(booking, actionButton.action)}
              className={`rounded px-3 py-1.5 text-sm ${actionButton.className}`}
            >
              {actionButton.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BookingQueueCard;
