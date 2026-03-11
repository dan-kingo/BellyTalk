import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/layout/Layout";
import ToastBanner from "../components/common/ToastBanner";
import { useAdminStore } from "../stores/admin.store";
import { AdminBookingQueueItem, BookingDetail } from "../types";
import { bookingAdminService } from "../services/booking-admin.service";
import { QueueQuery } from "../services/booking-admin.service";
import { useSearchParams } from "react-router-dom";
import BookingQueueCard from "./bookings-queue/BookingQueueCard";
import BookingActionDialog from "./bookings-queue/BookingActionDialog";
import { QueueAction, TabType } from "./bookings-queue/types";
import {
  CheckCircle2,
  Clock3,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";

const DEFAULT_QUEUE_QUERY: QueueQuery = { page: 1, limit: 20 };
const VALID_TABS: TabType[] = [
  "pending-confirmations",
  "pending-payment",
  "today",
];

const parseTab = (value: string | null): TabType => {
  if (value && VALID_TABS.includes(value as TabType)) {
    return value as TabType;
  }

  return "pending-confirmations";
};

const parsePositiveNumber = (value: string | null, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseQueueQuery = (searchParams: URLSearchParams): QueueQuery => {
  const serviceMode = searchParams.get("service_mode");

  return {
    page: parsePositiveNumber(searchParams.get("page"), 1),
    limit: parsePositiveNumber(searchParams.get("limit"), 20),
    doctor_id: searchParams.get("doctor_id") || undefined,
    service_mode:
      serviceMode === "video" ||
      serviceMode === "audio" ||
      serviceMode === "message" ||
      serviceMode === "in_person"
        ? serviceMode
        : undefined,
    date: searchParams.get("date") || undefined,
  };
};

const buildSearchParams = (tab: TabType, query: QueueQuery) => {
  const params = new URLSearchParams();

  params.set("tab", tab);

  if (query.page && query.page > 1) {
    params.set("page", String(query.page));
  }

  if (query.limit && query.limit !== 20) {
    params.set("limit", String(query.limit));
  }

  if (query.doctor_id) {
    params.set("doctor_id", query.doctor_id);
  }

  if (query.service_mode) {
    params.set("service_mode", query.service_mode);
  }

  if (query.date) {
    params.set("date", query.date);
  }

  return params;
};

const serializeQueueQuery = (query: QueueQuery) =>
  JSON.stringify({
    page: query.page || 1,
    limit: query.limit || 20,
    doctor_id: query.doctor_id || "",
    service_mode: query.service_mode || "",
    date: query.date || "",
  });

const BookingsQueuePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));
  const urlQuery = useMemo(() => parseQueueQuery(searchParams), [searchParams]);
  const queue = useAdminStore((state) => state.bookingQueueByTab[tab] || []);
  const loading = useAdminStore(
    (state) => state.bookingQueueLoadingByTab[tab] || false,
  );
  const error = useAdminStore(
    (state) => state.bookingQueueErrorByTab[tab] || "",
  );
  const query = useAdminStore((state) => state.bookingQueueQueryByTab[tab]);
  const bookingQueueQueryByTab = useAdminStore(
    (state) => state.bookingQueueQueryByTab,
  );
  const pagination = useAdminStore(
    (state) => state.bookingQueuePaginationByTab[tab],
  );
  const metrics = useAdminStore((state) => state.bookingQueueMetrics);
  const metricsLoading = useAdminStore(
    (state) => state.bookingQueueMetricsLoading,
  );

  const fetchBookingQueue = useAdminStore((state) => state.fetchBookingQueue);
  const setBookingQueueQuery = useAdminStore(
    (state) => state.setBookingQueueQuery,
  );
  const fetchBookingQueueMetrics = useAdminStore(
    (state) => state.fetchBookingQueueMetrics,
  );
  const refreshBookingQueuePanel = useAdminStore(
    (state) => state.refreshBookingQueuePanel,
  );
  const confirmBookingFromQueue = useAdminStore(
    (state) => state.confirmBookingFromQueue,
  );
  const cancelBookingFromQueue = useAdminStore(
    (state) => state.cancelBookingFromQueue,
  );
  const completeBookingFromQueue = useAdminStore(
    (state) => state.completeBookingFromQueue,
  );
  const markNoShowFromQueue = useAdminStore(
    (state) => state.markNoShowFromQueue,
  );
  const reviewBookingPaymentFromQueue = useAdminStore(
    (state) => state.reviewBookingPaymentFromQueue,
  );

  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [activeDialog, setActiveDialog] = useState<QueueAction | null>(null);
  const [selectedBooking, setSelectedBooking] =
    useState<AdminBookingQueueItem | null>(null);
  const [noteOrReason, setNoteOrReason] = useState("");
  const [selectedBookingDetail, setSelectedBookingDetail] =
    useState<BookingDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const paymentDocs = selectedBookingDetail?.booking_documents || [];
  const currentQuery = query || DEFAULT_QUEUE_QUERY;
  const currentQueryKey = useMemo(
    () => serializeQueueQuery(currentQuery),
    [currentQuery],
  );
  const urlQueryKey = useMemo(() => serializeQueueQuery(urlQuery), [urlQuery]);

  useEffect(() => {
    (async () => {
      try {
        if (currentQueryKey !== urlQueryKey) {
          setBookingQueueQuery(tab, urlQuery);
        }

        await Promise.all([
          fetchBookingQueueMetrics(),
          fetchBookingQueue(tab, true),
        ]);
      } catch {
        // error is already captured in store state
      }
    })();
  }, [
    currentQueryKey,
    fetchBookingQueue,
    fetchBookingQueueMetrics,
    setBookingQueueQuery,
    tab,
    urlQuery,
    urlQueryKey,
  ]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(""), 3200);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshBookingQueuePanel(tab);
    } catch {
      // error is captured in store
    }
    setRefreshing(false);
  };

  const openActionDialog = (
    booking: AdminBookingQueueItem,
    action: QueueAction,
  ) => {
    setSelectedBooking(booking);
    setActiveDialog(action);
    setActionError("");
    setNoteOrReason("");
    setSelectedBookingDetail(null);

    if (action === "payment_approve" || action === "payment_reject") {
      setDetailLoading(true);
      bookingAdminService
        .getBookingDetails(booking.id)
        .then((response) => {
          setSelectedBookingDetail(response.booking || null);
        })
        .catch(() => {
          setActionError("Could not load payment proof details");
        })
        .finally(() => setDetailLoading(false));
    }
  };

  const closeActionDialog = () => {
    if (actionLoading) return;
    setSelectedBooking(null);
    setActiveDialog(null);
    setActionError("");
    setNoteOrReason("");
    setSelectedBookingDetail(null);
  };

  const submitAction = async () => {
    if (!selectedBooking || !activeDialog) return;

    try {
      setActionLoading(true);
      setActionError("");

      if (activeDialog === "confirm") {
        await confirmBookingFromQueue(
          selectedBooking.id,
          noteOrReason || undefined,
        );
      }

      if (activeDialog === "cancel") {
        if (!noteOrReason.trim()) {
          setActionError("Reason is required to cancel.");
          return;
        }
        await cancelBookingFromQueue(selectedBooking.id, noteOrReason);
      }

      if (activeDialog === "complete") {
        await completeBookingFromQueue(
          selectedBooking.id,
          noteOrReason || undefined,
        );
      }

      if (activeDialog === "no_show") {
        await markNoShowFromQueue(
          selectedBooking.id,
          noteOrReason || undefined,
        );
      }

      if (activeDialog === "payment_approve") {
        const paymentId = selectedBooking.pending_payment?.id;
        if (!paymentId) {
          setActionError("Payment item not found for this booking.");
          return;
        }
        await reviewBookingPaymentFromQueue(
          selectedBooking.id,
          paymentId,
          "approved",
        );
      }

      if (activeDialog === "payment_reject") {
        const paymentId = selectedBooking.pending_payment?.id;
        if (!paymentId) {
          setActionError("Payment item not found for this booking.");
          return;
        }
        if (!noteOrReason.trim()) {
          setActionError("Rejection reason is required.");
          return;
        }
        await reviewBookingPaymentFromQueue(
          selectedBooking.id,
          paymentId,
          "rejected",
          noteOrReason,
        );
      }

      await refreshBookingQueuePanel(tab);
      setSuccessMessage("Action completed successfully.");
      closeActionDialog();
    } catch (err: any) {
      setActionError(err?.response?.data?.error || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const renderMetrics = () => {
    if (!metrics) return null;

    const cards = [
      {
        label: "Pending Confirmations",
        value: metrics.pending_confirmations,
        icon: Clock3,
      },
      {
        label: "Pending Payment Reviews",
        value: metrics.pending_payment_reviews,
        icon: ClipboardList,
      },
      {
        label: "Today Bookings",
        value: metrics.todays_bookings,
        icon: CheckCircle2,
      },
      {
        label: "Overdue Confirmations",
        value: metrics.overdue_confirmations,
        icon: AlertTriangle,
      },
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {card.label}
                </p>
                <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                {card.value}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  const currentPage = pagination?.page || query?.page || 1;
  const currentLimit = query?.limit || pagination?.limit || 20;
  const totalItems = pagination?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / currentLimit));

  const updateRouteQuery = (nextTab: TabType, nextQuery: QueueQuery) => {
    setSearchParams(buildSearchParams(nextTab, nextQuery));
  };

  const setFilter = (patch: Partial<QueueQuery>) => {
    updateRouteQuery(tab, {
      ...currentQuery,
      ...patch,
      page: 1,
    });
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    updateRouteQuery(tab, {
      ...currentQuery,
      page,
    });
  };

  const handleTabChange = (nextTab: TabType) => {
    updateRouteQuery(
      nextTab,
      bookingQueueQueryByTab[nextTab] || DEFAULT_QUEUE_QUERY,
    );
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Booking Ops Queue
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Review confirmations, payment proofs, and today operations.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading || metricsLoading}
            className="px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90 disabled:opacity-60"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {successMessage && (
          <ToastBanner
            message={successMessage}
            variant="success"
            onClose={() => setSuccessMessage("")}
            className="mb-4"
          />
        )}

        {renderMetrics()}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <input
            type="text"
            value={query?.doctor_id || ""}
            onChange={(e) =>
              setFilter({ doctor_id: e.target.value || undefined })
            }
            placeholder="Filter by doctor id"
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />

          <select
            value={query?.service_mode || ""}
            onChange={(e) =>
              setFilter({
                service_mode: (e.target.value || undefined) as
                  | "video"
                  | "audio"
                  | "message"
                  | "in_person"
                  | undefined,
              })
            }
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            <option value="">All modes</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
            <option value="message">Message</option>
            <option value="in_person">In-person</option>
          </select>

          <input
            type="date"
            value={query?.date || ""}
            onChange={(e) => setFilter({ date: e.target.value || undefined })}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />

          <select
            value={String(currentLimit)}
            onChange={(e) =>
              setFilter({ limit: Number(e.target.value), page: 1 })
            }
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          >
            <option value="10">10 / page</option>
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
          </select>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => handleTabChange("pending-confirmations")}
            className={`px-4 py-2 rounded-lg text-sm ${
              tab === "pending-confirmations"
                ? "bg-primary text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            }`}
          >
            Pending Confirmations
          </button>
          <button
            onClick={() => handleTabChange("pending-payment")}
            className={`px-4 py-2 rounded-lg text-sm ${
              tab === "pending-payment"
                ? "bg-primary text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            }`}
          >
            Pending Payment Reviews
          </button>
          <button
            onClick={() => handleTabChange("today")}
            className={`px-4 py-2 rounded-lg text-sm ${
              tab === "today"
                ? "bg-primary text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            }`}
          >
            Today Queue
          </button>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-gray-600 dark:text-gray-300">
            Loading queue...
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-300">
            {error}
          </div>
        ) : queue.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-gray-600 dark:text-gray-300">
            No queue items found.
          </div>
        ) : (
          <div className="space-y-3">
            {queue.map((booking) => (
              <BookingQueueCard
                key={booking.id}
                booking={booking}
                tab={tab}
                onAction={openActionDialog}
              />
            ))}
          </div>
        )}

        {!loading && !error && queue.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <p>
              Page {currentPage} of {totalPages} ({totalItems} items)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        <BookingActionDialog
          isOpen={!!activeDialog && !!selectedBooking}
          action={activeDialog}
          booking={selectedBooking}
          noteOrReason={noteOrReason}
          actionError={actionError}
          actionLoading={actionLoading}
          detailLoading={detailLoading}
          paymentDocs={paymentDocs}
          onClose={closeActionDialog}
          onSubmit={submitAction}
          onNoteOrReasonChange={setNoteOrReason}
        />
      </div>
    </Layout>
  );
};

export default BookingsQueuePage;
