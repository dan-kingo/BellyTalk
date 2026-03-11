import React, { useState, useEffect } from "react";
import Layout from "../components/layout/Layout";
import { UsersPageSkeleton } from "../components/common/PageSkeletons";
import Dialog from "../components/common/Dialog";
import ToastBanner from "../components/common/ToastBanner";
import { adminService } from "../services/admin.service";
import { useAdminStore } from "../stores/admin.store";
import { Trash2, Search } from "lucide-react";

const UsersPage: React.FC = () => {
  const users = useAdminStore((state) => state.users);
  const loading = useAdminStore((state) => state.usersLoading);
  const usersLoaded = useAdminStore((state) => state.usersLoaded);
  const fetchUsers = useAdminStore((state) => state.fetchUsers);
  const fetchOverview = useAdminStore((state) => state.fetchOverview);
  const removeUserFromCache = useAdminStore(
    (state) => state.removeUserFromCache,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<{
    id: string;
    fullName: string;
  } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!usersLoaded) {
      fetchUsers();
    }
  }, [usersLoaded, fetchUsers]);

  const handleDeleteUser = async (userId: string) => {
    try {
      setDeleting(userId);
      await adminService.deleteUser(userId);
      removeUserFromCache(userId);
      await fetchOverview(true);
      setDeleteCandidate(null);
      setToast({
        message: "User deleted successfully.",
        variant: "success",
      });
    } catch (error) {
      console.error("Failed to delete user:", error);
      setToast({
        message: "Failed to delete user",
        variant: "error",
      });
    } finally {
      setDeleting(null);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading) {
    return (
      <Layout>
        <UsersPageSkeleton />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Users Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage all registered users
          </p>
        </div>

        {toast && (
          <ToastBanner
            message={toast.message}
            variant={toast.variant}
            onClose={() => setToast(null)}
            className="mb-4"
          />
        )}

        <div className="mb-6 w-full max-w-full min-w-0">
          <div className="relative w-full max-w-full min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-full min-w-0 pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div className="w-full max-w-full overflow-x-auto rounded-xl">
            <table className="min-w-[760px] w-max">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-900/30"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.full_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          user.role_status === "approved"
                            ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                            : user.role_status === "pending"
                              ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400"
                        }`}
                      >
                        {user.role_status || "active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() =>
                          setDeleteCandidate({
                            id: user.id,
                            fullName: user.full_name,
                          })
                        }
                        disabled={deleting === user.id}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 cursor-pointer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">No users found</p>
          </div>
        )}

        <Dialog
          isOpen={!!deleteCandidate}
          onClose={() => !deleting && setDeleteCandidate(null)}
          title="Delete User"
        >
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Are you sure you want to delete{" "}
              <strong>{deleteCandidate?.fullName}</strong>?
            </p>
            <p className="text-sm text-red-600 dark:text-red-400">
              This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  deleteCandidate && handleDeleteUser(deleteCandidate.id)
                }
                disabled={!!deleting}
                className="flex-1 cursor-pointer bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg font-medium transition"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                disabled={!!deleting}
                className="flex-1 cursor-pointer px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </Dialog>
      </div>
    </Layout>
  );
};

export default UsersPage;
