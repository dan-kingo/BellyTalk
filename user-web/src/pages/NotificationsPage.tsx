import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CircleAlert, RefreshCw } from "lucide-react";
import Layout from "../components/layout/Layout";
import Skeleton from "../components/common/Skeleton";
import { useAuth } from "../contexts/AuthContext";
import { useNotificationStore } from "../stores/notification.store";

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const loading = useNotificationStore((state) => state.loading);
  const error = useNotificationStore((state) => state.error);
  const fetchNotifications = useNotificationStore(
    (state) => state.fetchNotifications,
  );
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);

  const notificationRole: "mother" | "doctor" | "admin" | null =
    profile?.role === "mother"
      ? "mother"
      : profile?.role === "doctor"
        ? "doctor"
        : profile?.role === "admin"
          ? "admin"
          : null;
  const canSeeNotifications = notificationRole !== null;

  const seenStorageKey = profile?.role
    ? `${profile.role}_notification_seen_ids`
    : "notification_seen_ids";

  const seenSet = (() => {
    try {
      const raw = localStorage.getItem(seenStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return new Set<string>(Array.isArray(parsed) ? parsed : []);
    } catch {
      return new Set<string>();
    }
  })();

  useEffect(() => {
    if (!notificationRole) {
      return;
    }

    fetchNotifications(notificationRole, true);
    const timer = setInterval(() => {
      fetchNotifications(notificationRole);
    }, 30_000);

    return () => clearInterval(timer);
  }, [notificationRole, fetchNotifications]);

  if (!canSeeNotifications) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
          <CircleAlert className="mx-auto h-10 w-10 text-gray-400" />
          <h1 className="mt-3 text-xl font-semibold text-gray-900 dark:text-white">
            Notifications are not available for this role
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Use a mother, doctor, or admin account to view activity alerts.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Notifications Center
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Booking reminders and status updates for your account.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:bg-secondary/10 dark:text-secondary">
                {unreadCount} unread
              </span>
              <button
                onClick={() => {
                  if (!notificationRole) return;
                  fetchNotifications(notificationRole, true);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
              <button
                onClick={markAllAsRead}
                disabled={notifications.length === 0}
                className="cursor-pointer rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
              >
                Mark all read
              </button>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <section className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
            <Bell className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              No notifications right now
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              We will surface booking and payment updates here.
            </p>
          </section>
        ) : (
          <section className="space-y-3">
            {notifications.map((item) => {
              const isUnread = !seenSet.has(item.id);

              return (
                <article
                  key={item.id}
                  className={`rounded-xl border p-4 transition ${
                    isUnread
                      ? "border-primary/40 bg-primary/5 dark:border-secondary/50 dark:bg-secondary/10"
                      : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                        {item.message}
                      </p>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {new Date(item.createdAt).toLocaleString(undefined, { timeZone: 'Africa/Addis_Ababa' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isUnread && (
                        <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white dark:bg-secondary">
                          unread
                        </span>
                      )}
                      <button
                        onClick={() => {
                          markAsRead(item.id);
                          navigate(item.link);
                        }}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
        )}
      </div>
    </Layout>
  );
};

export default NotificationsPage;
