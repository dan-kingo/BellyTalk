import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CircleDollarSign,
  Clock3,
  Stethoscope,
} from "lucide-react";
import { toast } from "react-toastify";
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
              </article>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MyBookingsPage;
