import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CircleDollarSign,
  Clock3,
  Upload,
  Stethoscope,
} from "lucide-react";
import { toast } from "react-toastify";
import Dialog from "../components/common/Dialog";
import Layout from "../components/layout/Layout";
import Skeleton from "../components/common/Skeleton";
import { bookingService } from "../services/booking.service";
import { doctorDiscoveryService } from "../services/doctor-discovery.service";
import { useChatStore } from "../stores/chat.store";
import { Booking, BookingStatus, DoctorServiceMode } from "../types";
import { useLocation, useNavigate } from "react-router-dom";

const statusStyles: Record<BookingStatus, string> = {
  pending_payment:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  pending_confirmation:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
  confirmed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
  completed:
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300",
  no_show:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300",
  expired: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const cancellableStatuses: BookingStatus[] = [
  "pending_payment",
  "pending_confirmation",
  "confirmed",
];

const MyBookingsPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const createConversation = useChatStore((state) => state.createConversation);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [doctorNames, setDoctorNames] = useState<Record<string, string>>({});
  const [listType, setListType] = useState<"upcoming" | "past">("upcoming");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "">("");
  const [modeFilter, setModeFilter] = useState<DoctorServiceMode | "">("");
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [proofBooking, setProofBooking] = useState<Booking | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofReference, setProofReference] = useState("");
  const [proofSubmitting, setProofSubmitting] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sessionActionLoading, setSessionActionLoading] = useState<
    Record<string, boolean>
  >({});
  const [clockTick, setClockTick] = useState(Date.now());
  const [visitGuideBooking, setVisitGuideBooking] = useState<Booking | null>(
    null,
  );

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      const result = await bookingService.listMyBookings({
        type: listType,
        status: statusFilter,
        service_mode: modeFilter,
      });
      setBookings(result);

      const doctorIds = Array.from(
        new Set(result.map((item) => item.doctor_id)),
      );
      if (doctorIds.length) {
        const doctorPresence =
          await doctorDiscoveryService.getDoctorsPresence(doctorIds);
        const map: Record<string, string> = {};
        doctorPresence.forEach((doctor) => {
          map[doctor.id] = doctor.full_name;
        });
        setDoctorNames(map);
      } else {
        setDoctorNames({});
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error || "Failed to load your bookings.",
      );
    } finally {
      setLoading(false);
    }
  }, [listType, modeFilter, statusFilter]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const openBookingDetail = useCallback(
    async (bookingId: string, fallbackBooking?: Booking) => {
      try {
        setDetailLoading(true);
        setDetailOpen(true);
        setDetailBooking(fallbackBooking || null);
        const detail = await bookingService.getBooking(bookingId);
        setDetailBooking(detail as Booking);
      } catch (err: any) {
        if (fallbackBooking) {
          setDetailBooking(fallbackBooking);
          return;
        }

        setDetailOpen(false);
        toast.error(
          err?.response?.data?.error || "Failed to load booking details.",
        );
      } finally {
        setDetailLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const openBookingId = (location.state as { openBookingId?: string } | null)
      ?.openBookingId;

    if (!openBookingId || loading || bookings.length === 0) {
      return;
    }

    const matchingBooking = bookings.find(
      (booking) => booking.id === openBookingId,
    );
    if (!matchingBooking) {
      return;
    }

    void openBookingDetail(openBookingId, matchingBooking);
    navigate(location.pathname, { replace: true, state: null });
  }, [
    location.pathname,
    location.state,
    bookings,
    loading,
    navigate,
    openBookingDetail,
  ]);

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

  const cancelBooking = async (bookingId: string) => {
    const reason = window.prompt("Cancellation reason (optional):") || "";

    try {
      await bookingService.cancelBooking(bookingId, reason || undefined);
      toast.success("Booking cancelled.");
      await loadBookings();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to cancel booking.");
    }
  };

  const canUploadPaymentProof = (booking: Booking) =>
    booking.payment_method === "proof_upload" &&
    booking.status === "pending_payment" &&
    booking.payment_status !== "paid";

  const openProofDialog = (booking: Booking) => {
    setProofBooking(booking);
    setProofFile(null);
    setProofReference("");
    setProofError(null);
    setProofDialogOpen(true);
  };

  const closeProofDialog = () => {
    setProofDialogOpen(false);
    setProofBooking(null);
    setProofFile(null);
    setProofReference("");
    setProofError(null);
  };

  const submitProofPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!proofBooking) {
      setProofError("Missing booking context. Please retry.");
      return;
    }
    if (!proofFile) {
      setProofError("Please select a payment proof file.");
      return;
    }
    if (proofFile.size > 8 * 1024 * 1024) {
      setProofError("File must be 8MB or smaller.");
      return;
    }

    try {
      setProofSubmitting(true);
      setProofError(null);

      const docs = await bookingService.addBookingDocuments(
        proofBooking.id,
        [proofFile],
        "payment_proof",
      );
      const paymentProof = docs[0];
      if (!paymentProof?.id) {
        throw new Error("Payment proof upload did not return a document ID.");
      }

      await bookingService.submitBookingPayment(proofBooking.id, {
        payment_method: "proof_upload",
        amount: Number(proofBooking.service_price_snapshot),
        currency: proofBooking.currency || "ETB",
        transaction_reference: proofReference || undefined,
        proof_document_id: paymentProof.id,
      });

      toast.success("Payment proof submitted. Waiting for doctor review.");
      closeProofDialog();
      await loadBookings();
    } catch (err: any) {
      setProofError(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to submit payment proof.",
      );
    } finally {
      setProofSubmitting(false);
    }
  };

  const formatDuration = (ms: number) => {
    const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
    if (totalMinutes < 60) return `${totalMinutes}m`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours < 24) return `${hours}h ${minutes}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };

  const getSessionState = (booking: Booking) => {
    if (booking.status !== "confirmed") {
      return {
        canStart: false,
        reason: "Session actions unlock once booking is confirmed.",
      };
    }

    if (booking.service_mode === "in_person") {
      return { canStart: true, reason: "View visit instructions." };
    }

    if (booking.service_mode === "message") {
      return { canStart: true, reason: "Open your consultation chat." };
    }

    const startAt = new Date(booking.scheduled_start).getTime();
    const endAt = new Date(booking.scheduled_end).getTime();
    const openAt = startAt - 15 * 60 * 1000;
    const closeAt = endAt + 30 * 60 * 1000;

    if (clockTick < openAt) {
      return {
        canStart: false,
        reason: `Available in ${formatDuration(openAt - clockTick)}`,
      };
    }

    if (clockTick > closeAt) {
      return {
        canStart: false,
        reason: "Session window has passed.",
      };
    }

    return { canStart: true, reason: "Session is live. You can join now." };
  };

  const getSessionBadge = (booking: Booking) => {
    if (booking.status !== "confirmed") return null;
    if (booking.service_mode === "in_person") return "Visit";
    if (booking.service_mode === "message") return "Chat";

    const startAt = new Date(booking.scheduled_start).getTime();
    const endAt = new Date(booking.scheduled_end).getTime();
    const openAt = startAt - 15 * 60 * 1000;
    const closeAt = endAt + 30 * 60 * 1000;

    if (clockTick < openAt) {
      return `Starts in ${formatDuration(openAt - clockTick)}`;
    }
    if (clockTick > closeAt) {
      return "Window Closed";
    }
    return "Live Now";
  };

  const setBookingActionLoading = (bookingId: string, value: boolean) => {
    setSessionActionLoading((prev) => ({ ...prev, [bookingId]: value }));
  };

  const handleSessionAction = async (booking: Booking) => {
    const bookingId = booking.id;
    const doctorId = booking.doctor_id;

    if (booking.service_mode === "in_person") {
      setVisitGuideBooking(booking);
      return;
    }

    const sessionState = getSessionState(booking);
    if (!sessionState.canStart) {
      toast.info(sessionState.reason);
      return;
    }

    const channel =
      booking.service_mode === "audio"
        ? "audio"
        : booking.service_mode === "video"
          ? "video"
          : "message";

    try {
      setBookingActionLoading(bookingId, true);
      const join = await bookingService.checkJoinAccess(bookingId, channel);
      if (!join.allowed) {
        toast.error(join.error || "Session is not available yet.");
        return;
      }

      if (channel === "message") {
        await createConversation(doctorId, bookingId);
        navigate("/chat");
        toast.success("Consultation chat is ready.");
        return;
      }

      const targetPath = channel === "audio" ? "/audio-call" : "/video-call";
      navigate(targetPath, {
        state: {
          autoStartBookingCall: true,
          bookingId,
          bookingTarget: {
            id: doctorId,
            full_name: doctorNames[doctorId] || `Dr. ${doctorId.slice(0, 8)}`,
            email: "",
          },
        },
      });
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error || "Failed to start booking session.",
      );
    } finally {
      setBookingActionLoading(bookingId, false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Bookings
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Track consultation status, schedule, and payment progress.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
            <select
              value={listType}
              onChange={(event) =>
                setListType(event.target.value as "upcoming" | "past")
              }
              className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as BookingStatus | "")
              }
              className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
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
              className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">All modes</option>
              <option value="in_person">in_person</option>
              <option value="video">video</option>
              <option value="audio">audio</option>
              <option value="message">message</option>
            </select>

            <button
              onClick={loadBookings}
              className="cursor-pointer rounded-xl border border-primary px-3 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/5"
            >
              Refresh
            </button>
          </div>
        </section>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
              >
                <Skeleton className="h-5 w-48" />
                <Skeleton className="mt-3 h-4 w-72" />
                <Skeleton className="mt-2 h-4 w-44" />
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
            <CalendarClock className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              No bookings found
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Adjust filters or create a new booking from the Doctors page.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <article
                key={booking.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {booking.service_title_snapshot}
                    </h3>
                    <p className="mt-1 inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Stethoscope className="h-4 w-4" />
                      {doctorNames[booking.doctor_id] ||
                        `Dr. ${booking.doctor_id.slice(0, 8)}`}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[booking.status]}`}
                  >
                    {booking.status.replace(/_/g, " ")}
                  </span>
                </div>

                {getSessionBadge(booking) && (
                  <div className="mt-2">
                    <span className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary">
                      {getSessionBadge(booking)}
                    </span>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-2">
                  <p className="inline-flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" />
                    {new Date(booking.scheduled_start).toLocaleString()}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    Mode: {booking.service_mode}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <CircleDollarSign className="h-4 w-4" />
                    {Number(booking.service_price_snapshot).toFixed(2)}{" "}
                    {booking.currency}
                  </p>
                  <p>Payment: {booking.payment_method}</p>
                  <p>Payment status: {booking.payment_status || "pending"}</p>
                </div>

                {booking.booking_notes && (
                  <p className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    Note: {booking.booking_notes}
                  </p>
                )}

                <div className="mt-4">
                  <button
                    onClick={() => void openBookingDetail(booking.id, booking)}
                    className="cursor-pointer rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    View Details
                  </button>
                </div>

                {cancellableStatuses.includes(booking.status) && (
                  <div className="mt-4">
                    <button
                      onClick={() => cancelBooking(booking.id)}
                      className="cursor-pointer rounded-xl border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
                    >
                      Cancel Booking
                    </button>
                  </div>
                )}

                {canUploadPaymentProof(booking) && (
                  <div className="mt-3">
                    <button
                      onClick={() => openProofDialog(booking)}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5"
                    >
                      <Upload className="h-4 w-4" /> Upload Payment Proof
                    </button>
                  </div>
                )}

                {booking.status === "confirmed" && (
                  <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                      {getSessionState(booking).reason}
                    </p>
                    <button
                      onClick={() => handleSessionAction(booking)}
                      disabled={
                        !getSessionState(booking).canStart ||
                        sessionActionLoading[booking.id]
                      }
                      className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sessionActionLoading[booking.id]
                        ? "Opening..."
                        : booking.service_mode === "in_person"
                          ? "Visit Guidance"
                          : booking.service_mode === "message"
                            ? "Open Consultation Chat"
                            : booking.service_mode === "audio"
                              ? "Start Audio Session"
                              : "Start Video Session"}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <Dialog
        isOpen={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailBooking(null);
        }}
        title="Booking Details"
      >
        {detailLoading && !detailBooking ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : detailBooking ? (
          <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {detailBooking.service_title_snapshot}
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {doctorNames[detailBooking.doctor_id] ||
                    `Dr. ${detailBooking.doctor_id.slice(0, 8)}`}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[detailBooking.status]}`}
              >
                {detailBooking.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Start time
                </p>
                <p>
                  {new Date(detailBooking.scheduled_start).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  End time
                </p>
                <p>{new Date(detailBooking.scheduled_end).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Service mode
                </p>
                <p>{detailBooking.service_mode}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Payment
                </p>
                <p>
                  {detailBooking.payment_method} •{" "}
                  {detailBooking.payment_status || "pending"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Price
                </p>
                <p>
                  {Number(detailBooking.service_price_snapshot).toFixed(2)}{" "}
                  {detailBooking.currency}
                </p>
              </div>
              {detailBooking.patient_age ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Patient age
                  </p>
                  <p>{detailBooking.patient_age}</p>
                </div>
              ) : null}
            </div>

            {detailBooking.symptoms && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Symptoms
                </p>
                <p className="mt-1 rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-800">
                  {detailBooking.symptoms}
                </p>
              </div>
            )}

            {detailBooking.booking_notes && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Booking notes
                </p>
                <p className="mt-1 rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-800">
                  {detailBooking.booking_notes}
                </p>
              </div>
            )}

            {detailBooking.booking_documents?.length ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Documents
                </p>
                <div className="mt-2 space-y-2">
                  {detailBooking.booking_documents.map((document) => (
                    <a
                      key={document.id}
                      href={document.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-xl border border-gray-200 px-3 py-2 text-sm text-primary transition hover:bg-primary/5 dark:border-gray-700 dark:text-secondary"
                    >
                      {document.file_name || document.document_type}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setDetailOpen(false);
                  setDetailBooking(null);
                }}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Booking details are not available right now.
          </p>
        )}
      </Dialog>

      <Dialog
        isOpen={proofDialogOpen}
        onClose={closeProofDialog}
        title="Submit Booking Payment Proof"
      >
        <form className="space-y-4" onSubmit={submitProofPayment}>
          {proofBooking && (
            <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <p className="font-semibold">
                {proofBooking.service_title_snapshot}
              </p>
              <p className="mt-1">
                Amount: {Number(proofBooking.service_price_snapshot).toFixed(2)}{" "}
                {proofBooking.currency}
              </p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Proof file (image or PDF)
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(event) =>
                setProofFile(event.target.files?.[0] || null)
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Transaction reference (optional)
            </label>
            <input
              type="text"
              value={proofReference}
              onChange={(event) => setProofReference(event.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Bank transfer ref / receipt ID"
            />
          </div>

          {proofError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
              {proofError}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeProofDialog}
              disabled={proofSubmitting}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={proofSubmitting}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
            >
              {proofSubmitting ? "Submitting..." : "Submit Proof"}
            </button>
          </div>
        </form>
      </Dialog>

      <Dialog
        isOpen={Boolean(visitGuideBooking)}
        onClose={() => setVisitGuideBooking(null)}
        title="In-Person Visit Guidance"
      >
        {visitGuideBooking && (
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <p>
              <span className="font-semibold">Service:</span>{" "}
              {visitGuideBooking.service_title_snapshot}
            </p>
            <p>
              <span className="font-semibold">Visit time:</span>{" "}
              {new Date(visitGuideBooking.scheduled_start).toLocaleString()} -{" "}
              {new Date(visitGuideBooking.scheduled_end).toLocaleString()}
            </p>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <p className="font-semibold">How to attend</p>
              <ul className="mt-1 list-disc pl-5 text-xs">
                <li>Arrive 10-15 minutes before the scheduled start time.</li>
                <li>Bring your ID and any relevant medical records.</li>
                <li>
                  If you cannot attend, cancel or reschedule early to avoid
                  missing your slot.
                </li>
              </ul>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setVisitGuideBooking(null)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </Layout>
  );
};

export default MyBookingsPage;
