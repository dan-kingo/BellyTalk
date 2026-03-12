import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { doctorProfileService } from "../../services/doctor-profile.service";
import { DoctorProfile } from "../../types";
import Skeleton from "./Skeleton";

const ALLOWED_ONBOARDING_PATHS = new Set([
  "/doctor/complete-profile",
  "/doctor/pending-approval",
]);

const isDoctorProfileComplete = (
  doctorProfile: DoctorProfile | null,
  profileExtra: any,
) => {
  const profileHasSubmission =
    Boolean(profileExtra?.doctor_profile) ||
    Boolean(profileExtra?.completion_submitted_at) ||
    (Array.isArray(profileExtra?.verification_documents) &&
      profileExtra.verification_documents.length > 0);

  if (!doctorProfile) {
    return profileHasSubmission;
  }

  const hasHeadline = Boolean(doctorProfile.headline?.trim());
  const hasBio = Boolean(doctorProfile.bio?.trim());
  const hasSpecialties = Boolean(doctorProfile.specialties?.length);
  const hasLanguages = Boolean(doctorProfile.languages?.length);
  const hasExperience = typeof doctorProfile.years_of_experience === "number";
  const doctorMetadataDocs =
    doctorProfile.metadata?.verification_documents ||
    doctorProfile.metadata?.verificationDocs ||
    [];
  const profileDocs = profileExtra?.verification_documents || [];
  const verificationDocs =
    Array.isArray(profileDocs) && profileDocs.length > 0
      ? profileDocs
      : doctorMetadataDocs;
  const hasVerificationDocs =
    Array.isArray(verificationDocs) && verificationDocs.length > 0;

  return (
    profileHasSubmission ||
    (hasHeadline &&
      hasBio &&
      hasSpecialties &&
      hasLanguages &&
      hasExperience &&
      hasVerificationDocs)
  );
};

interface DoctorOnboardingGuardProps {
  children: React.ReactNode;
}

const DoctorOnboardingGuard: React.FC<DoctorOnboardingGuardProps> = ({
  children,
}) => {
  const location = useLocation();
  const { user, profile, loading } = useAuth();
  const [checking, setChecking] = useState(false);
  const [hasCheckedDoctorProfile, setHasCheckedDoctorProfile] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(
    null,
  );
  const isDoctor = profile?.role === "doctor";

  useEffect(() => {
    if (loading || !user || !isDoctor) {
      return;
    }

    let active = true;
    const loadDoctorProfile = async () => {
      setHasCheckedDoctorProfile(false);
      setChecking(true);
      try {
        const nextDoctorProfile =
          await doctorProfileService.getMyDoctorProfile();
        if (active) {
          setDoctorProfile(nextDoctorProfile);
        }
      } catch (error: any) {
        if (error?.response?.status === 404) {
          if (active) {
            setDoctorProfile(null);
          }
        }
      } finally {
        if (active) {
          setChecking(false);
          setHasCheckedDoctorProfile(true);
        }
      }
    };

    loadDoctorProfile();
    return () => {
      active = false;
    };
  }, [loading, user?.id, isDoctor]);

  const doctorCompletedProfile = useMemo(
    () => isDoctorProfileComplete(doctorProfile, profile?.extra),
    [doctorProfile, profile?.extra],
  );

  if (!isDoctor) {
    return <>{children}</>;
  }

  if (checking || !hasCheckedDoctorProfile) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <Skeleton className="h-8 w-60" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  const isOnOnboardingPage = ALLOWED_ONBOARDING_PATHS.has(location.pathname);

  if (
    !doctorCompletedProfile &&
    location.pathname !== "/doctor/complete-profile"
  ) {
    return <Navigate to="/doctor/complete-profile" replace />;
  }

  if (doctorCompletedProfile && profile?.role_status !== "approved") {
    if (!isOnOnboardingPage) {
      return <Navigate to="/doctor/pending-approval" replace />;
    }
  }

  if (
    doctorCompletedProfile &&
    profile?.role_status === "approved" &&
    isOnOnboardingPage
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default DoctorOnboardingGuard;
