import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { Booking, Content, DoctorService, Hospital, Product } from "../types";
import {
  BookOpen,
  Building2,
  ArrowRight,
  ShoppingBag,
  BriefcaseMedical,
  ClipboardCheck,
  CalendarClock,
  CircleAlert,
} from "lucide-react";
import Dialog from "../components/common/Dialog";
import { useDashboardStore } from "../stores/dashboard.store";
import Skeleton from "../components/common/Skeleton";
import { doctorServiceService } from "../services/doctor-service.service";
import { bookingService } from "../services/booking.service";

const DashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const products = useDashboardStore((state) => state.previewProducts);
  const contents = useDashboardStore((state) => state.previewContents);
  const hospitals = useDashboardStore((state) => state.previewHospitals);
  const loading = useDashboardStore((state) => state.loading);
  const fetchDashboardData = useDashboardStore(
    (state) => state.fetchDashboardData,
  );
  const [viewingContent, setViewingContent] = useState<Content | null>(null);
  const [showContentDialog, setShowContentDialog] = useState(false);
  const [viewingHospital, setViewingHospital] = useState<Hospital | null>(null);
  const [showHospitalDialog, setShowHospitalDialog] = useState(false);
  const [doctorServices, setDoctorServices] = useState<DoctorService[]>([]);
  const [doctorUpcomingBookings, setDoctorUpcomingBookings] = useState<
    Booking[]
  >([]);
  const [doctorSummaryLoading, setDoctorSummaryLoading] = useState(false);

  const previewProducts = products.slice(0, 6);
  const previewContents = contents.slice(0, 6);
  const previewHospitals = hospitals.slice(0, 6);

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

  const handleViewContent = (content: Content) => {
    setViewingContent(content);
    setShowContentDialog(true);
  };

  const handleViewHospital = (hospital: Hospital) => {
    setViewingHospital(hospital);
    setShowHospitalDialog(true);
  };

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
  const mother = profile.role === "mother";
  const doctor = profile.role === "doctor";
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

  const renderMotherDashboard = () => (
    <div className="space-y-8">
      <div className="bg-linear-to-r from-primary to-primary-600 dark:from-secondary dark:to-secondary/80 rounded-xl shadow-lg p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">
          Welcome back, {doctor ? "Dr." : mother ? "Ms." : "Mr."}{" "}
          {profile.full_name}!
        </h2>
        <p className="text-white/90">
          {" "}
          {mother
            ? "Track your pregnancy journey and stay connected with your care team."
            : "Manage your patients and stay updated with the latest information."}
        </p>
      </div>

      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-6 h-6 text-primary dark:text-secondary" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              Shop
            </h3>
          </div>
          <button
            onClick={() => navigate("/shop")}
            className="flex cursor-pointer items-center gap-2 text-primary dark:text-secondary hover:gap-3 transition-all"
          >
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {loading ? (
          <div className="flex gap-4 overflow-x-hidden">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="min-w-[85%] sm:min-w-[48%] lg:min-w-[32%] bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6"
              >
                <Skeleton className="h-40 w-full rounded-lg" />
                <Skeleton className="h-6 w-2/3 mt-4" />
                <Skeleton className="h-4 w-full mt-3" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-4 pb-2">
              {previewProducts.map((product: Product) => (
                <div
                  key={product.id}
                  className="min-w-[85%] sm:min-w-[48%] lg:min-w-[32%] bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition p-6 border border-gray-100 dark:border-gray-700"
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="w-full h-40 object-cover rounded-lg mb-4"
                    />
                  ) : (
                    <div className="w-full h-40 rounded-lg mb-4 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                  )}
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {product.title}
                  </h4>
                  {product.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-2">
                      {product.description}
                    </p>
                  )}
                  <p className="mt-3 text-primary dark:text-secondary font-bold">
                    ${Number(product.price).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Showing up to 6 products. Use "View All" to browse the full shop.
        </p>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-primary dark:text-secondary" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              Educational Content
            </h3>
          </div>
          <button
            onClick={() => navigate("/content")}
            className="flex cursor-pointer items-center gap-2 text-primary dark:text-secondary hover:gap-3 transition-all"
          >
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {loading ? (
          <div className="flex gap-4 overflow-x-hidden">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="min-w-[85%] sm:min-w-[48%] lg:min-w-[32%] bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6"
              >
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full mt-4" />
                <Skeleton className="h-4 w-5/6 mt-2" />
                <div className="flex gap-2 mt-4">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-4 pb-2">
              <Dialog
                isOpen={showContentDialog}
                onClose={() => setShowContentDialog(false)}
                title={viewingContent?.title || "Content Details"}
              >
                {viewingContent && (
                  <div className="space-y-4">
                    {viewingContent.cover_url && (
                      <img
                        src={viewingContent.cover_url}
                        alt={viewingContent.title}
                        className="w-full h-64 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Description
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {viewingContent.body}
                      </p>
                    </div>
                    {viewingContent.category && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                          Category
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                          {viewingContent.category}
                        </p>
                      </div>
                    )}
                    {viewingContent.tags && viewingContent.tags.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                          Tags
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {viewingContent.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 text-xs font-medium rounded-full bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        Language
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {viewingContent.language.toUpperCase()}
                      </p>
                    </div>
                  </div>
                )}
              </Dialog>
              {previewContents.map((content) => (
                <div
                  key={content.id}
                  className="min-w-[85%] sm:min-w-[48%] lg:min-w-[32%] bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition p-6 border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex-1">
                      {content.title}
                    </h3>
                    {content.is_published ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                        Published
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400">
                        Draft
                      </span>
                    )}
                  </div>

                  <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-4">
                    {content.body}
                  </p>
                  {content.body.length > 150 && (
                    <button
                      onClick={() => handleViewContent(content)}
                      className="text-sm text-primary dark:text-secondary hover:underline mb-3"
                    >
                      See more
                    </button>
                  )}

                  {content.category && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Category:{" "}
                      <span className="font-medium">{content.category}</span>
                    </p>
                  )}

                  {content.tags && content.tags.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {content.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                    Language: {content.language.toUpperCase()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Showing up to 6 content items. Use "View All" to see everything.
        </p>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-primary dark:text-secondary" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              Hospitals
            </h3>
          </div>
          <button
            onClick={() => navigate("/hospitals")}
            className="flex cursor-pointer items-center gap-2 text-primary dark:text-secondary hover:gap-3 transition-all"
          >
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {loading ? (
          <div className="flex gap-4 overflow-x-hidden">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="min-w-[85%] sm:min-w-[48%] lg:min-w-[32%] bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6"
              >
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/3 mt-3" />
                <Skeleton className="h-4 w-full mt-4" />
                <Skeleton className="h-4 w-5/6 mt-2" />
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-4 pb-2">
              <Dialog
                isOpen={showHospitalDialog}
                onClose={() => setShowHospitalDialog(false)}
                title={viewingHospital?.name || "Hospital Details"}
              >
                {viewingHospital && (
                  <div className="space-y-4">
                    {viewingHospital.city && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {viewingHospital.city}
                      </p>
                    )}

                    {viewingHospital.description && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                          Description
                        </h3>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {viewingHospital.description}
                        </p>
                      </div>
                    )}

                    {viewingHospital.services &&
                      viewingHospital.services.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                            Services
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {viewingHospital.services.map((service, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary"
                              >
                                {service}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      {viewingHospital.address && (
                        <p>{viewingHospital.address}</p>
                      )}
                      {viewingHospital.phone && <p>{viewingHospital.phone}</p>}
                      {viewingHospital.email && <p>{viewingHospital.email}</p>}
                      {viewingHospital.website && (
                        <a
                          href={viewingHospital.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary dark:text-secondary hover:underline"
                        >
                          Visit Website
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </Dialog>
              {previewHospitals.map((hospital) => (
                <div
                  key={hospital.id}
                  className="min-w-[85%] sm:min-w-[48%] lg:min-w-[32%] bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition p-6 border border-gray-100 dark:border-gray-700"
                >
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {hospital.name}
                  </h3>
                  {hospital.city && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {hospital.city}
                    </p>
                  )}
                  {hospital.description && (
                    <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
                      {hospital.description}
                    </p>
                  )}
                  {hospital.description &&
                    hospital.description.length > 140 && (
                      <button
                        onClick={() => handleViewHospital(hospital)}
                        className="text-sm text-primary dark:text-secondary hover:underline mb-3"
                      >
                        See more
                      </button>
                    )}
                  {hospital.services && hospital.services.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {hospital.services.map((service, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    {hospital.address && <p>{hospital.address}</p>}
                    {hospital.phone && <p>{hospital.phone}</p>}
                    {hospital.email && <p>{hospital.email}</p>}
                    {hospital.website && (
                      <a
                        href={hospital.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary dark:text-secondary hover:underline"
                      >
                        Visit Website
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Showing up to 6 hospitals. Use "View All" for the full list.
        </p>
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
          className="group rounded-xl border border-gray-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
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
          className="group rounded-xl border border-gray-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
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
