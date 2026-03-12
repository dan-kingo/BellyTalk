import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import Dialog from "../components/common/Dialog";
import Layout from "../components/layout/Layout";
import Skeleton from "../components/common/Skeleton";
import { bookingService } from "../services/booking.service";
import { Booking, BookingStatus, DoctorServiceMode } from "../types";

const actionableStatuses: BookingStatus[] = [
  "pending_payment",
  "pending_confirmation",
  "confirmed",
];

type ActionType = "confirm" | "cancel" | "complete" | "reschedule";

const DoctorBookingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [typeFilter, setTypeFilter] = useState<"upcoming" | "past">("upcoming");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "">("");
  const [modeFilter, setModeFilter] = useState<DoctorServiceMode | "">("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [rescheduleStartLocal, setRescheduleStartLocal] = useState("");
  const [rescheduleDuration, setRescheduleDuration] = useState("30");
  const [actionError, setActionError] = useState<string | null>(null);
  const [paymentReviewLoading, setPaymentReviewLoading] = useState(false);
  const [paymentReviewError, setPaymentReviewError] = useState<string | null>(
    null,
  );
  const [rejectReason, setRejectReason] = useState("");

  const loadBookings = async () => {
    try {
      setLoading(true);
      const data = await bookingService.listDoctorBookings({
        type: typeFilter,
        status: statusFilter,
        service_mode: modeFilter,
      });
      setBookings(data);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error || "Failed to load doctor bookings.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [typeFilter, statusFilter, modeFilter]);

  const statusOptions = useMemo(
    () =>
      [
        "pending_payment",
        "pending_confirmation",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
        "expired",
      ] as BookingStatus[],
    [],
  );

  const openBookingDetail = async (bookingId: string) => {
    try {
      const detail = await bookingService.getBooking(bookingId);
      setSelectedBooking(detail);
      setDetailOpen(true);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error || "Failed to load booking detail.",
      );
    }
  };

  const runAction = async (
    action: () => Promise<any>,
    successMessage: string,
  ): Promise<boolean> => {
    try {
      setActionLoading(true);
      await action();
      toast.success(successMessage);
      if (selectedBooking?.id) {
        await openBookingDetail(selectedBooking.id);
      }
      await loadBookings();
      return true;
    } catch (err: any) {
      const message = err?.response?.data?.error || "Action failed.";
      setActionError(message);
      toast.error(message);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const closeActionDialog = () => {
    setActionDialogOpen(false);
    setActiveAction(null);
    setActiveBooking(null);
    setActionNote("");
    setRescheduleStartLocal("");
    setRescheduleDuration("30");
    setActionError(null);
  };

  const openActionDialog = (action: ActionType, booking: Booking) => {
    setActiveAction(action);
    setActiveBooking(booking);
    setActionError(null);
    setActionNote("");

    if (action === "reschedule") {
      const start = new Date(booking.scheduled_start);
      const end = new Date(booking.scheduled_end);
      const durationMinutes = Math.max(
        Math.round((end.getTime() - start.getTime()) / 60000),
        1,
      );

      const local = new Date(
        start.getTime() - start.getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16);

      setRescheduleStartLocal(local);
      setRescheduleDuration(String(durationMinutes));
    }

    setActionDialogOpen(true);
  };

  const submitAction = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionError(null);

    if (!activeAction || !activeBooking) {
      setActionError("Missing action context. Please retry.");
      return;
    }

    if (activeAction === "cancel" && !actionNote.trim()) {
      setActionError("Cancellation reason is required.");
      return;
    }

    if (activeAction === "reschedule") {
      if (!rescheduleStartLocal) {
        setActionError("Please choose a new start date/time.");
        return;
      }

      const duration = Number(rescheduleDuration);
      if (!Number.isFinite(duration) || duration <= 0) {
        setActionError("Duration must be greater than 0.");
        return;
      }

      const start = new Date(rescheduleStartLocal);
      if (Number.isNaN(start.getTime())) {
        setActionError("Invalid start date/time.");
        return;
      }

      const end = new Date(start.getTime() + duration * 60000);

      const ok = await runAction(
        () =>
          bookingService.rescheduleBooking(
            activeBooking.id,
            start.toISOString(),
            end.toISOString(),
            actionNote || undefined,
          ),
        "Booking rescheduled.",
      );
      if (ok) closeActionDialog();
      return;
    }

    if (activeAction === "confirm") {
      const ok = await runAction(
        () =>
          bookingService.confirmBooking(
            activeBooking.id,
            actionNote || undefined,
          ),
        "Booking confirmed.",
      );
      if (ok) closeActionDialog();
      return;
    }

    if (activeAction === "complete") {
      const ok = await runAction(
        () =>
          bookingService.completeBooking(
            activeBooking.id,
            actionNote || undefined,
          ),
        "Booking completed.",
      );
      if (ok) closeActionDialog();
      return;
    }

    const ok = await runAction(
      () =>
        bookingService.cancelBooking(activeBooking.id, actionNote || undefined),
      "Booking cancelled.",
    );
    if (ok) closeActionDialog();
  };

  const actionTitle = useMemo(() => {
    if (activeAction === "confirm") return "Confirm Booking";
    if (activeAction === "complete") return "Mark Booking Complete";
    if (activeAction === "cancel") return "Cancel Booking";
    if (activeAction === "reschedule") return "Reschedule Booking";
    return "Booking Action";
  }, [activeAction]);

  const actionPrimaryLabel = useMemo(() => {
    if (actionLoading) return "Processing...";
    if (activeAction === "confirm") return "Confirm";
    if (activeAction === "complete") return "Mark Complete";
    if (activeAction === "cancel") return "Cancel Booking";
    if (activeAction === "reschedule") return "Save New Schedule";
    return "Submit";
  }, [activeAction, actionLoading]);

  const pendingProofPayment = useMemo(() => {
    const payments = selectedBooking?.booking_payments || [];
    return (
      payments.find(
        (payment: any) =>
          payment?.payment_method === "proof_upload" &&
          payment?.status === "pending_review",
      ) || null
    );
  }, [selectedBooking]);

  const proofUrlMap = useMemo(() => {
    const map: Record<string, string> = {};
    const docs = selectedBooking?.booking_documents || [];
    for (const doc of docs) {
      if (doc?.id && doc?.file_url) {
        map[doc.id] = doc.file_url;
      }
    }
    return map;
  }, [selectedBooking]);

  const reviewPendingProofPayment = async (status: "approved" | "rejected") => {
    if (!selectedBooking?.id || !pendingProofPayment?.id) {
      setPaymentReviewError("No pending proof payment found.");
      return;
    }

    if (status === "rejected" && !rejectReason.trim()) {
      setPaymentReviewError("Please provide a rejection reason.");
      return;
    }

    try {
      setPaymentReviewLoading(true);
      setPaymentReviewError(null);

      await bookingService.reviewBookingPayment(
        selectedBooking.id,
        pendingProofPayment.id,
        {
          status,
          rejection_reason:
            status === "rejected" ? rejectReason.trim() : undefined,
        },
      );

      toast.success(
        status === "approved" ? "Payment approved." : "Payment rejected.",
      );
      setRejectReason("");
      await openBookingDetail(selectedBooking.id);
      await loadBookings();
    } catch (err: any) {
      setPaymentReviewError(
        err?.response?.data?.error || "Failed to review payment.",
      );
    } finally {
      setPaymentReviewLoading(false);
    }
  };

  const canRunActions = (booking: Booking) => {
    if (booking.status === "pending_confirmation") {
      return { confirm: true, complete: false, reschedule: true, cancel: true };
    }

    if (booking.status === "confirmed") {
      return { confirm: false, complete: true, reschedule: true, cancel: true };
    }

    if (booking.status === "pending_payment") {
      return {
        confirm: false,
        complete: false,
        reschedule: true,
        cancel: true,
      };
    }

    return {
      confirm: false,
      complete: false,
      reschedule: false,
      cancel: false,
    };
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Doctor Bookings
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Review requests and operate your daily consultations.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as "upcoming" | "past")
              }
              className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as BookingStatus | "")
              }
              className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ")}
                </option>
              ))}
            </select>

            <select
              value={modeFilter}
              onChange={(event) =>
                setModeFilter(event.target.value as DoctorServiceMode | "")
              }
              className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">All modes</option>
              <option value="video">video</option>
              <option value="audio">audio</option>
              <option value="message">message</option>
              <option value="in_person">in_person</option>
            </select>

            <button
              onClick={loadBookings}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary px-3 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/5"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </section>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
            <CalendarClock className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              No bookings found
            </h2>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <article
                key={booking.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {booking.service_title_snapshot}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      {new Date(booking.scheduled_start).toLocaleString()} •{" "}
                      {booking.service_mode}
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {booking.status.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => openBookingDetail(booking.id)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    View Detail
                  </button>

                  {actionableStatuses.includes(booking.status) && (
                    <>
                      {canRunActions(booking).confirm && (
                        <button
                          onClick={() => openActionDialog("confirm", booking)}
                          className="inline-flex items-center gap-1 rounded-lg border border-green-300 px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/20"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
                        </button>
                      )}
                      {canRunActions(booking).reschedule && (
                        <button
                          onClick={() =>
                            openActionDialog("reschedule", booking)
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/20"
                        >
                          <Clock3 className="h-3.5 w-3.5" /> Reschedule
                        </button>
                      )}
                      {canRunActions(booking).cancel && (
                        <button
                          onClick={() => openActionDialog("cancel", booking)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Cancel
                        </button>
                      )}
                      {canRunActions(booking).complete && (
                        <button
                          onClick={() => openActionDialog("complete", booking)}
                          className="inline-flex items-center gap-1 rounded-lg border border-purple-300 px-3 py-1.5 text-xs font-semibold text-purple-700 transition hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-900/20"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Mark Complete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Dialog
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setPaymentReviewError(null);
          setRejectReason("");
        }}
        title="Booking Detail"
      >
        {selectedBooking ? (
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-semibold">Service:</span>{" "}
              {selectedBooking.service_title_snapshot}
            </p>
            <p>
              <span className="font-semibold">Status:</span>{" "}
              {selectedBooking.status}
            </p>
            <p>
              <span className="font-semibold">Schedule:</span>{" "}
              {new Date(selectedBooking.scheduled_start).toLocaleString()} -{" "}
              {new Date(selectedBooking.scheduled_end).toLocaleString()}
            </p>
            <p>
              <span className="font-semibold">Payment status:</span>{" "}
              {selectedBooking.payment_status || "-"}
            </p>
            {selectedBooking.booking_notes && (
              <p>
                <span className="font-semibold">Notes:</span>{" "}
                {selectedBooking.booking_notes}
              </p>
            )}

            {selectedBooking.mother_profile && (
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <p className="font-semibold">Patient</p>
                <p>{selectedBooking.mother_profile.full_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedBooking.mother_profile.email}
                </p>
              </div>
            )}

            {selectedBooking.booking_payments?.length > 0 && (
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                <p className="font-semibold">Payments</p>
                {selectedBooking.booking_payments.map((payment: any) => (
                  <div key={payment.id} className="mt-2 text-xs">
                    <p>
                      {payment.amount} {payment.currency} • {payment.status}
                    </p>
                    {payment.transaction_reference && (
                      <p>Ref: {payment.transaction_reference}</p>
                    )}
                    {payment.proof_document_id && (
                      <div className="mt-1">
                        {proofUrlMap[payment.proof_document_id] ? (
                          <a
                            href={proofUrlMap[payment.proof_document_id]}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-300"
                          >
                            View payment proof
                          </a>
                        ) : (
                          <p>Proof ID: {payment.proof_document_id}</p>
                        )}
                      </div>
                    )}
                    {payment.rejection_reason && (
                      <p className="mt-1 text-red-600 dark:text-red-300">
                        Rejection reason: {payment.rejection_reason}
                      </p>
                    )}
                  </div>
                ))}

                {pendingProofPayment && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-900/20">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                      Pending payment proof review
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => reviewPendingProofPayment("approved")}
                        disabled={paymentReviewLoading}
                        className="inline-flex items-center gap-1 rounded-lg border border-green-300 px-3 py-1.5 text-xs font-semibold text-green-700 transition hover:bg-green-50 disabled:opacity-60 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/20"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => reviewPendingProofPayment("rejected")}
                        disabled={paymentReviewLoading}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>

                    <div className="mt-2">
                      <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Rejection reason
                      </label>
                      <textarea
                        rows={2}
                        value={rejectReason}
                        onChange={(event) =>
                          setRejectReason(event.target.value)
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-xs text-gray-900 outline-none ring-primary-500 focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                        placeholder="Required when rejecting"
                      />
                    </div>

                    {paymentReviewError && (
                      <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                        {paymentReviewError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300">Loading...</p>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => {
              setDetailOpen(false);
              setPaymentReviewError(null);
              setRejectReason("");
            }}
            disabled={actionLoading || paymentReviewLoading}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </Dialog>

      <Dialog
        isOpen={actionDialogOpen}
        onClose={closeActionDialog}
        title={actionTitle}
      >
        <form className="space-y-4" onSubmit={submitAction}>
          {activeBooking && (
            <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <p className="font-semibold">
                {activeBooking.service_title_snapshot}
              </p>
              <p className="mt-1">
                Current:{" "}
                {new Date(activeBooking.scheduled_start).toLocaleString()} -{" "}
                {new Date(activeBooking.scheduled_end).toLocaleString()}
              </p>
            </div>
          )}

          {activeAction === "reschedule" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  New start
                </label>
                <input
                  type="datetime-local"
                  value={rescheduleStartLocal}
                  onChange={(event) =>
                    setRescheduleStartLocal(event.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  value={rescheduleDuration}
                  onChange={(event) =>
                    setRescheduleDuration(event.target.value)
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {activeAction === "cancel" ? "Reason" : "Note (optional)"}
            </label>
            <textarea
              rows={3}
              value={actionNote}
              onChange={(event) => setActionNote(event.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder={
                activeAction === "cancel"
                  ? "Provide cancellation reason"
                  : "Optional internal note"
              }
              required={activeAction === "cancel"}
            />
          </div>

          {actionError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
              {actionError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeActionDialog}
              disabled={actionLoading}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
            >
              {actionPrimaryLabel}
            </button>
          </div>
        </form>
      </Dialog>
    </Layout>
  );
};

export default DoctorBookingsPage;
