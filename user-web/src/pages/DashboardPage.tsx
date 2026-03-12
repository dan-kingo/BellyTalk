import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { Booking, DoctorService } from "../types";
import {
  BookOpen,
  Building2,
  ArrowRight,
  ShoppingBag,
  BriefcaseMedical,
  ClipboardCheck,
  CalendarClock,
  CircleAlert,
  HeartPulse,
  ShieldPlus,
  Stethoscope,
  MessageCircle,
} from "lucide-react";
import { useDashboardStore } from "../stores/dashboard.store";
import Skeleton from "../components/common/Skeleton";
import { doctorServiceService } from "../services/doctor-service.service";
import { bookingService } from "../services/booking.service";
import { doctorDiscoveryService } from "../services/doctor-discovery.service";

const DashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const contents = useDashboardStore((state) => state.previewContents);
  const loading = useDashboardStore((state) => state.loading);
  const fetchDashboardData = useDashboardStore(
    (state) => state.fetchDashboardData,
  );
  const [doctorServices, setDoctorServices] = useState<DoctorService[]>([]);
  const [doctorUpcomingBookings, setDoctorUpcomingBookings] = useState<
    Booking[]
  >([]);
  const [doctorSummaryLoading, setDoctorSummaryLoading] = useState(false);
  const [motherBookingsLoading, setMotherBookingsLoading] = useState(false);
  const [motherBookings, setMotherBookings] = useState<Booking[]>([]);
  const [trustedDoctors, setTrustedDoctors] = useState<
    Array<{
      id: string;
      full_name: string;
      status: "online" | "offline" | "away";
      last_seen: string | null;
      bookings_count: number;
    }>
  >([]);

  const previewContents = contents.slice(0, 6);

  const canManageContent =
    profile?.role === "doctor" ||
    profile?.role === "counselor" ||
    profile?.role === "admin";
  const canManageHospitals =
    profile?.role === "doctor" ||
    profile?.role === "counselor" ||
    profile?.role === "admin";

  useEffect(() => {
    if (!profile) return;
    fetchDashboardData(canManageContent, canManageHospitals);
  }, [profile, canManageContent, canManageHospitals, fetchDashboardData]);

  useEffect(() => {
    const loadDoctorSummary = async () => {
      if (!profile || profile.role !== "doctor") {
        setDoctorServices([]);
        setDoctorUpcomingBookings([]);
        return;
      }

      try {
        setDoctorSummaryLoading(true);
        const [services, bookings] = await Promise.all([
          doctorServiceService.listMyServices(),
          bookingService.listDoctorBookings({ type: "upcoming", limit: 100 }),
        ]);

        setDoctorServices(services);
        setDoctorUpcomingBookings(bookings);
      } catch {
        setDoctorServices([]);
        setDoctorUpcomingBookings([]);
      } finally {
        setDoctorSummaryLoading(false);
      }
    };

    loadDoctorSummary();
  }, [profile]);

  useEffect(() => {
    const loadMotherJourney = async () => {
      if (!profile || profile.role !== "mother") {
        setMotherBookings([]);
        setTrustedDoctors([]);
        return;
      }

      try {
        setMotherBookingsLoading(true);
        const bookings = await bookingService.listMyBookings({ limit: 100 });
        setMotherBookings(bookings);

        const counts = new Map<string, number>();
        for (const booking of bookings) {
          counts.set(
            booking.doctor_id,
            (counts.get(booking.doctor_id) || 0) + 1,
          );
        }
        const doctorIds = Array.from(counts.keys());
        if (!doctorIds.length) {
          setTrustedDoctors([]);
          return;
        }

        const presence =
          await doctorDiscoveryService.getDoctorsPresence(doctorIds);
        const presenceMap = new Map(
          presence.map((doctor) => [doctor.id, doctor]),
        );

        const trusted = doctorIds
          .map((id) => {
            const profileData = presenceMap.get(id);
            return {
              id,
              full_name: profileData?.full_name || `Dr. ${id.slice(0, 8)}`,
              status: (profileData?.status || "offline") as
                | "online"
                | "offline"
                | "away",
              last_seen: profileData?.last_seen || null,
              bookings_count: counts.get(id) || 0,
            };
          })
          .sort((a, b) => b.bookings_count - a.bookings_count)
          .slice(0, 4);

        setTrustedDoctors(trusted);
      } catch {
        setMotherBookings([]);
        setTrustedDoctors([]);
      } finally {
        setMotherBookingsLoading(false);
      }
    };

    loadMotherJourney();
  }, [profile]);

  if (!profile) {
    return (
      <Layout>
        <div className="space-y-8 max-w-7xl mx-auto">
          <div className="rounded-xl p-8 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-full mt-4" />
            <Skeleton className="h-4 w-2/3 mt-2" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-56" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-44 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }
  const activeDoctorServices = doctorServices.filter(
    (service) => service.is_active,
  );
  const pendingConfirmations = doctorUpcomingBookings.filter(
    (booking) => booking.status === "pending_confirmation",
  );
  const confirmedBookings = doctorUpcomingBookings.filter(
    (booking) => booking.status === "confirmed",
  );
  const todayDateIso = new Date().toISOString().slice(0, 10);
  const todaysBookings = doctorUpcomingBookings.filter(
    (booking) => booking.scheduled_start.slice(0, 10) === todayDateIso,
  );
  const motherNextBooking = motherBookings
    .filter(
      (booking) =>
        ["pending_confirmation", "confirmed", "pending_payment"].includes(
          booking.status,
        ) && new Date(booking.scheduled_start).getTime() >= Date.now(),
    )
    .sort(
      (a, b) =>
        new Date(a.scheduled_start).getTime() -
        new Date(b.scheduled_start).getTime(),
    )[0];

  const formatStatusLabel = (status: Booking["status"]) =>
    status.replace(/_/g, " ");

  const renderMotherDashboard = () => (
    <div className="space-y-8">
      <div className="rounded-xl bg-linear-to-r from-primary to-primary-600 p-8 text-white shadow-lg dark:from-secondary dark:to-secondary/80">
        <h2 className="mb-2 text-3xl font-bold">
          Care Journey, {profile.full_name}
        </h2>
        <p className="text-white/90">
          Your next care step first, then your trusted doctors, then essentials.
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary dark:text-secondary" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Next Appointment
          </h3>
        </div>

        {motherBookingsLoading ? (
          <Skeleton className="h-28 w-full rounded-xl" />
        ) : motherNextBooking ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {motherNextBooking.service_title_snapshot}
            </p>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              {new Date(motherNextBooking.scheduled_start).toLocaleString()} •{" "}
              {motherNextBooking.service_mode}
            </p>
            <p className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-primary dark:bg-gray-800">
              {formatStatusLabel(motherNextBooking.status)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() =>
                  navigate("/bookings", {
                    state: { openBookingId: motherNextBooking.id },
                  })
                }
                className="rounded-lg bg-primary cursor-pointer px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-primary-700"
              >
                Open Details
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              No upcoming appointments yet.
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Book a trusted doctor to start your next care step.
            </p>
            <button
              onClick={() => navigate("/doctors")}
              className="mt-3 rounded-lg cursor-pointer bg-primary px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-primary-700"
            >
              Find Doctor
            </button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary dark:text-secondary" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Trusted Doctors
            </h3>
          </div>
          <button
            onClick={() => navigate("/doctors")}
            className="text-sm font-semibold cursor-pointer text-primary hover:underline dark:text-secondary"
          >
            Browse all
          </button>
        </div>

        {motherBookingsLoading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, idx) => (
              <Skeleton key={idx} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : trustedDoctors.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Your trusted doctor list will appear after your first booking.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {trustedDoctors.map((doctorItem) => (
              <button
                key={doctorItem.id}
                type="button"
                onClick={() => navigate(`/doctors/${doctorItem.id}`)}
                className="rounded-xl border border-gray-200 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer dark:border-gray-700"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {doctorItem.full_name}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${doctorItem.status === "online" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : doctorItem.status === "away" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}
                  >
                    {doctorItem.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                  {doctorItem.bookings_count} booking
                  {doctorItem.bookings_count > 1 ? "s" : ""} together
                </p>
                <p className="mt-2 text-xs font-semibold text-primary dark:text-secondary">
                  View Services &amp; Book
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-2">
          <ShieldPlus className="h-5 w-5 text-primary dark:text-secondary" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Essentials
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            onClick={() => navigate("/bookings")}
            className="rounded-xl border cursor-pointer border-gray-200 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700"
          >
            <HeartPulse className="h-5 w-5 text-primary dark:text-secondary" />
            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
              My Care Sessions
            </p>
          </button>

          <button
            onClick={() => navigate("/doctors")}
            className="rounded-xl border cursor-pointer border-gray-200 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700"
          >
            <MessageCircle className="h-5 w-5 text-primary dark:text-secondary" />
            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
              Contact Doctors
            </p>
          </button>

          <button
            onClick={() => navigate("/shop")}
            className="rounded-xl border cursor-pointer border-gray-200 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700"
          >
            <ShoppingBag className="h-5 w-5 text-primary dark:text-secondary" />
            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
              Care Essentials Shop
            </p>
          </button>

          <button
            onClick={() => navigate("/hospitals")}
            className="rounded-xl border cursor-pointer border-gray-200 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700"
          >
            <Building2 className="h-5 w-5 text-primary dark:text-secondary" />
            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
              Nearby Hospitals
            </p>
          </button>
        </div>
      </section>

      <section>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary dark:text-secondary" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              Education For This Week
            </h3>
          </div>
          <button
            onClick={() => navigate("/content")}
            className="flex cursor-pointer items-center gap-2 text-primary transition-all hover:gap-3 dark:text-secondary"
          >
            View All <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex gap-4 overflow-x-hidden">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="min-w-[85%] rounded-xl border border-gray-100 bg-white p-6 dark:border-gray-700 dark:bg-gray-800 sm:min-w-[48%] lg:min-w-[32%]"
              >
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="mt-4 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-5/6" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-4 pb-2">
              {previewContents.map((content) => (
                <div
                  key={content.id}
                  className="min-w-[85%] rounded-xl border border-gray-100 bg-white p-6 shadow-md transition hover:shadow-xl dark:border-gray-700 dark:bg-gray-800 sm:min-w-[48%] lg:min-w-[32%]"
                >
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {content.title}
                  </h3>
                  <p className="mt-3 line-clamp-4 text-gray-700 dark:text-gray-300">
                    {content.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );

  const renderCounselorDashboard = () => renderMotherDashboard();
  const renderDoctorDashboard = () => (
    <div className="space-y-8">
      <div className="rounded-xl bg-linear-to-r from-blue-600 to-cyan-600 p-8 text-white shadow-lg">
        <h2 className="mb-2 text-3xl font-bold">
          Welcome back, Dr. {profile.full_name}!
        </h2>
        <p className="text-white/90">
          Manage your consultation pipeline, keep services bookable, and respond
          to pending booking actions.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {doctorSummaryLoading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-28 w-full rounded-xl" />
          ))
        ) : (
          <>
            <article className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Active Services
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {activeDoctorServices.length}
              </p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {doctorServices.length} total configured
              </p>
            </article>

            <article className="rounded-xl border border-orange-200 bg-orange-50 p-5 dark:border-orange-900/40 dark:bg-orange-900/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-300">
                Pending Confirmations
              </p>
              <p className="mt-2 text-3xl font-bold text-orange-800 dark:text-orange-200">
                {pendingConfirmations.length}
              </p>
              <p className="mt-1 text-sm text-orange-700/90 dark:text-orange-200/90">
                Requires action from you
              </p>
            </article>

            <article className="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/40 dark:bg-blue-900/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                Upcoming Confirmed
              </p>
              <p className="mt-2 text-3xl font-bold text-blue-800 dark:text-blue-200">
                {confirmedBookings.length}
              </p>
              <p className="mt-1 text-sm text-blue-700/90 dark:text-blue-200/90">
                Confirmed consultations ahead
              </p>
            </article>

            <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/40 dark:bg-emerald-900/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Today\'s Sessions
              </p>
              <p className="mt-2 text-3xl font-bold text-emerald-800 dark:text-emerald-200">
                {todaysBookings.length}
              </p>
              <p className="mt-1 text-sm text-emerald-700/90 dark:text-emerald-200/90">
                Scheduled for today
              </p>
            </article>
          </>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <button
          onClick={() => navigate("/doctor/services")}
          className="group rounded-xl border cursor-pointer border-gray-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="flex items-center gap-3">
            <BriefcaseMedical className="h-5 w-5 text-primary dark:text-secondary" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Manage Services
            </h3>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Add services, set pricing, and maintain availability so patients can
            book.
          </p>
          <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary dark:text-secondary">
            Open Service Desk{" "}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </p>
        </button>

        <button
          onClick={() => navigate("/doctor/bookings")}
          className="group rounded-xl border cursor-pointer border-gray-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-5 w-5 text-primary dark:text-secondary" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Operate Bookings
            </h3>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Confirm, reschedule, complete, or cancel consultations with full
            context.
          </p>
          <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary dark:text-secondary">
            Open Booking Queue{" "}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </p>
        </button>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary dark:text-secondary" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Pending Confirmation Queue
            </h3>
          </div>
          <button
            onClick={() => navigate("/doctor/bookings")}
            className="text-sm font-semibold text-primary transition hover:underline dark:text-secondary"
          >
            View all
          </button>
        </div>

        {doctorSummaryLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Skeleton key={idx} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : pendingConfirmations.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center dark:border-gray-700 dark:bg-gray-800">
            <CircleAlert className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
              No pending confirmations right now.
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              New requests will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingConfirmations.slice(0, 5).map((booking) => (
              <article
                key={booking.id}
                className="rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {booking.service_title_snapshot}
                    </p>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                      {new Date(booking.scheduled_start).toLocaleString()} •{" "}
                      {booking.service_mode}
                    </p>
                  </div>
                  <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                    pending confirmation
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  const renderDashboardContent = () => {
    switch (profile.role) {
      case "mother":
        return renderMotherDashboard();
      case "counselor":
        return renderCounselorDashboard();
      case "doctor":
        return renderDoctorDashboard();
      default:
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Welcome to BellyTalk
            </h2>
            <p className="mt-2 text-gray-600">
              Your dashboard will appear here based on your role.
            </p>
          </div>
        );
    }
  };

  return <Layout>{renderDashboardContent()}</Layout>;
};

export default DashboardPage;
