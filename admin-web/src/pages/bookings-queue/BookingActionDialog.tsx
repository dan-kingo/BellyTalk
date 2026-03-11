import React from "react";
import Dialog from "../../components/common/Dialog";
import { AdminBookingQueueItem, BookingDocument } from "../../types";
import { QueueAction } from "./types";

interface BookingActionDialogProps {
  isOpen: boolean;
  action: QueueAction | null;
  booking: AdminBookingQueueItem | null;
  noteOrReason: string;
  actionError: string;
  actionLoading: boolean;
  detailLoading: boolean;
  paymentDocs: BookingDocument[];
  onClose: () => void;
  onSubmit: () => void;
  onNoteOrReasonChange: (value: string) => void;
}

const dialogTitles: Record<QueueAction, string> = {
  confirm: "Confirm Booking",
  cancel: "Cancel Booking",
  complete: "Complete Booking",
  no_show: "Mark Booking No-Show",
  payment_approve: "Approve Payment",
  payment_reject: "Reject Payment",
};

const submitLabels: Record<QueueAction, string> = {
  confirm: "Confirm booking",
  cancel: "Cancel booking",
  complete: "Complete booking",
  no_show: "Mark no-show",
  payment_approve: "Approve payment",
  payment_reject: "Reject payment",
};

const BookingActionDialog: React.FC<BookingActionDialogProps> = ({
  isOpen,
  action,
  booking,
  noteOrReason,
  actionError,
  actionLoading,
  detailLoading,
  paymentDocs,
  onClose,
  onSubmit,
  onNoteOrReasonChange,
}) => {
  if (!action) return null;

  const needsReason = action === "cancel" || action === "payment_reject";
  const needsNote =
    action === "confirm" || action === "complete" || action === "no_show";
  const isPaymentReview =
    action === "payment_approve" || action === "payment_reject";

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={dialogTitles[action] || "Booking Action"}
    >
      <div className="space-y-4">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <p>
            Booking: <span className="font-medium">{booking?.id}</span>
          </p>
          <p>
            Participants:{" "}
            {booking?.mother_profile?.full_name || booking?.mother_id}
            {" -> "}
            {booking?.doctor_profile?.full_name || booking?.doctor_id}
          </p>
        </div>

        {isPaymentReview && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
            <p className="mb-2 text-sm font-medium text-gray-800 dark:text-gray-100">
              Payment Proof Details
            </p>
            {detailLoading ? (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Loading details...
              </p>
            ) : (
              <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                <p>Payment ID: {booking?.pending_payment?.id || "-"}</p>
                <p>
                  Transaction Ref:{" "}
                  {booking?.pending_payment?.transaction_reference || "-"}
                </p>
                <p>
                  Amount: {booking?.pending_payment?.amount || "-"}
                  {booking?.pending_payment?.currency
                    ? ` ${booking.pending_payment.currency}`
                    : ""}
                </p>
                <p>
                  Proof Document ID:{" "}
                  {booking?.pending_payment?.proof_document_id || "-"}
                </p>
                <div>
                  <p className="mb-1 font-medium">Attached Documents:</p>
                  {paymentDocs.length === 0 ? (
                    <p>No attached documents found.</p>
                  ) : (
                    <div className="space-y-1">
                      {paymentDocs.map((doc) => (
                        <a
                          key={doc.id}
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-blue-600 underline dark:text-blue-400"
                        >
                          {doc.file_name || doc.document_type || doc.id}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {needsReason && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {action === "cancel" ? "Cancellation Reason" : "Rejection Reason"}
            </label>
            <textarea
              value={noteOrReason}
              onChange={(event) => onNoteOrReasonChange(event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
        )}

        {needsNote && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Optional Note
            </label>
            <textarea
              value={noteOrReason}
              onChange={(event) => onNoteOrReasonChange(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
        )}

        {actionError && (
          <div className="text-sm text-red-600 dark:text-red-400">
            {actionError}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onSubmit}
            disabled={actionLoading}
            className="rounded-lg bg-primary px-4 py-2 text-white disabled:opacity-60"
          >
            {actionLoading ? "Submitting..." : submitLabels[action]}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={actionLoading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 dark:border-gray-700 dark:text-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default BookingActionDialog;
