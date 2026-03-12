import React, { useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Hourglass, Sparkles } from "lucide-react";
import Layout from "../components/layout/Layout";
import { useAuth } from "../contexts/AuthContext";
import { authService } from "../services/auth.service";
import { doctorProfileService } from "../services/doctor-profile.service";
import { DoctorProfile } from "../types";

const statusTone = (status?: string) => {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
    case "rejected":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
    default:
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  }
};

const DoctorPendingApprovalPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, refreshProfile, logout } = useAuth();
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(
    null,
  );
  const [refreshing, setRefreshing] = useState(false);

  const doctorVerificationStatus =
    doctorProfile?.verification_status || profile?.role_status || "pending";

  const profileStatus = profile?.role_status || "pending";

  const justSubmitted = Boolean((location.state as any)?.justSubmitted);

  const effectiveProfileStatus = justSubmitted ? "pending" : profileStatus;
  const effectiveVerificationStatus = justSubmitted
    ? "pending"
    : doctorVerificationStatus;

  const isApproved = useMemo(
    () =>
      effectiveProfileStatus === "approved" ||
      effectiveVerificationStatus === "approved",
    [effectiveProfileStatus, effectiveVerificationStatus],
  );

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
      const refreshedProfile = await authService.getProfile();
      const data = await doctorProfileService.getMyDoctorProfile();
      setDoctorProfile(data);

      if (
        data?.verification_status === "approved" ||
        refreshedProfile?.role_status === "approved"
      ) {
        toast.success("Approval confirmed. Redirecting to dashboard.");
        navigate("/dashboard", { replace: true });
      } else {
        toast.info("Your account is still pending review.");
      }
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        toast.error("Unable to refresh doctor approval status.");
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      toast.success("Signed out successfully.");
      navigate("/login", { replace: true });
    } catch {
      toast.error("Failed to sign out. Please try again.");
    }
  };

  if (isApproved) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-linear-to-br from-amber-50 via-white to-orange-50 dark:from-amber-950/30 dark:via-gray-900 dark:to-orange-950/20 p-8 shadow-sm">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <Hourglass className="w-10 h-10 text-amber-600 dark:text-amber-300" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Your Application Is Under Review
            </h1>
            <p className="max-w-2xl text-sm text-gray-700 dark:text-gray-300">
              Your doctor profile has been submitted successfully. Our team is
              currently verifying your credentials and uploaded documents.
              Approval usually happens quickly, and you can check your status
              anytime from this page.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium bg-white/80 dark:bg-gray-800/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <Sparkles className="w-4 h-4" />
              Stay tuned, we will activate your doctor dashboard once verified.
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Account status:
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${statusTone(effectiveProfileStatus)}`}
            >
              {effectiveProfileStatus}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Verification status:
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${statusTone(effectiveVerificationStatus)}`}
            >
              {effectiveVerificationStatus}
            </span>
          </div>

          {effectiveProfileStatus === "rejected" && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Your profile review is rejected. Please update your profile and
              contact support.
            </p>
          )}

          <div className="rounded-lg border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/10 p-3 text-sm text-amber-700 dark:text-amber-300">
            Status checks are manual. Click <strong>Check Status</strong> when
            you want to refresh approval.
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handleRefreshStatus}
              disabled={refreshing}
              className="px-6 py-2 rounded-lg bg-primary hover:bg-primary/90 dark:bg-secondary dark:hover:bg-secondary/90 text-white font-medium disabled:opacity-60"
            >
              {refreshing ? "Checking..." : "Check Status"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/doctor/complete-profile")}
              className="px-6 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium"
            >
              Edit Doctor Profile
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="px-6 py-2 rounded-lg border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DoctorPendingApprovalPage;
