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
import { Booking, BookingStatus, DoctorServiceMode } from "../types";

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
              </article>
            ))}
          </div>
        )}
      </div>

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
    </Layout>
  );
};

export default MyBookingsPage;
