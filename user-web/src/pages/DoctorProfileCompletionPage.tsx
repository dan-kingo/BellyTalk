import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Layout from "../components/layout/Layout";
import { useAuth } from "../contexts/AuthContext";
import { doctorProfileService } from "../services/doctor-profile.service";
import { authService } from "../services/auth.service";

const parseCsv = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const DoctorProfileCompletionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verificationDocs, setVerificationDocs] = useState<File[]>([]);
  const [existingDocUrls, setExistingDocUrls] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    language: "en",
    location: "",
    avatar_url: "",
    headline: "",
    bio: "",
    specialties: "",
    languages: "",
    years_of_experience: "",
    hospital_affiliation: "",
  });

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      setLoading(true);
      try {
        if (profile) {
          setFormData((current) => ({
            ...current,
            full_name: profile.full_name || "",
            phone: profile.phone || "",
            language: profile.language || "en",
            location: profile.location || "",
            avatar_url: profile.avatar_url || "",
            bio: profile.bio || current.bio,
          }));

          const profileDocs = profile.extra?.verification_documents || [];
          if (Array.isArray(profileDocs)) {
            setExistingDocUrls(
              profileDocs.filter((url: unknown) => typeof url === "string"),
            );
          }
        }

        const doctorProfile = await doctorProfileService.getMyDoctorProfile();
        if (!active) {
          return;
        }

        setFormData((current) => ({
          ...current,
          headline: doctorProfile.headline || "",
          bio: doctorProfile.bio || current.bio,
          specialties: (doctorProfile.specialties || []).join(", "),
          languages: (doctorProfile.languages || []).join(", "),
          years_of_experience:
            typeof doctorProfile.years_of_experience === "number"
              ? String(doctorProfile.years_of_experience)
              : "",
          hospital_affiliation: doctorProfile.hospital_affiliation || "",
        }));
        const existingDocs =
          doctorProfile.metadata?.verification_documents ||
          doctorProfile.metadata?.verificationDocs ||
          [];
        if (Array.isArray(existingDocs)) {
          setExistingDocUrls((current) => {
            const merged = [...current, ...existingDocs].filter(
              (url) => typeof url === "string",
            ) as string[];
            return Array.from(new Set(merged));
          });
        }
      } catch (error: any) {
        if (error?.response?.status !== 404) {
          toast.error("Unable to load doctor profile form.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, [profile]);

  const completionReady = useMemo(() => {
    const hasVerificationDocs =
      verificationDocs.length > 0 || existingDocUrls.length > 0;

    return (
      Boolean(formData.full_name.trim()) &&
      Boolean(formData.language.trim()) &&
      Boolean(formData.headline.trim()) &&
      Boolean(formData.bio.trim()) &&
      parseCsv(formData.specialties).length > 0 &&
      parseCsv(formData.languages).length > 0 &&
      Number(formData.years_of_experience) >= 0 &&
      hasVerificationDocs
    );
  }, [formData, verificationDocs.length, existingDocUrls.length]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!completionReady) {
      toast.error("Please fill all required doctor profile fields.");
      return;
    }

    if (!user?.id) {
      toast.error("Unable to resolve user session.");
      return;
    }

    const payload = {
      headline: formData.headline.trim(),
      bio: formData.bio.trim(),
      specialties: parseCsv(formData.specialties),
      languages: parseCsv(formData.languages),
      years_of_experience: Number(formData.years_of_experience),
      hospital_affiliation: formData.hospital_affiliation.trim() || undefined,
      metadata: {
        completion_source: "user_web_onboarding",
      },
    };

    setSaving(true);
    try {
      const uploadedDocUrls = await Promise.all(
        verificationDocs.map(async (file) => {
          const result = await doctorProfileService.uploadVerificationDocument(
            file,
            user.id,
          );
          return result?.secure_url as string;
        }),
      );

      const verificationDocuments = [
        ...existingDocUrls,
        ...uploadedDocUrls.filter(Boolean),
      ];

      const uniqueVerificationDocuments = Array.from(
        new Set(verificationDocuments),
      );

      await doctorProfileService.upsertMyDoctorProfile({
        ...payload,
        metadata: {
          completion_source: "user_web_onboarding",
          verification_documents: uniqueVerificationDocuments,
          completion_submitted_at: new Date().toISOString(),
        },
      });

      await authService.updateProfile({
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || null,
        language: formData.language.trim().toLowerCase(),
        bio: payload.bio,
        location: formData.location.trim() || payload.hospital_affiliation,
        avatar_url: formData.avatar_url.trim() || null,
        extra: {
          ...(profile?.extra || {}),
          verification_documents: uniqueVerificationDocuments,
          completion_submitted_at: new Date().toISOString(),
          rejection_reason: null,
          doctor_profile: {
            headline: payload.headline,
            specialties: payload.specialties,
            languages: payload.languages,
            years_of_experience: payload.years_of_experience,
            hospital_affiliation: payload.hospital_affiliation,
            verification_documents: uniqueVerificationDocuments,
          },
        },
      });

      await refreshProfile();
      toast.success("Doctor profile completed. Awaiting approval.");
      navigate("/doctor/pending-approval", {
        replace: true,
        state: { justSubmitted: true },
      });
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        "Failed to save doctor profile. Please try again.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleVerificationDocsChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const incomingFiles = Array.from(event.target.files || []);
    if (incomingFiles.length === 0) {
      return;
    }

    const validFiles = incomingFiles.filter((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB file size limit.`);
        return false;
      }
      return true;
    });

    setVerificationDocs((current) => [...current, ...validFiles]);
  };

  const removeSelectedDoc = (index: number) => {
    setVerificationDocs((current) => current.filter((_, idx) => idx !== index));
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Complete Your Doctor Profile
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Fill in your professional details so mothers can discover your
            services after approval.
          </p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Loading profile form...
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-5"
          >
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Profile Details (profiles table)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Dr. Jane Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email (read-only)
                  </label>
                  <input
                    value={profile?.email || ""}
                    readOnly
                    className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="+2519..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Language *
                  </label>
                  <input
                    name="language"
                    value={formData.language}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="en"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location
                  </label>
                  <input
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Addis Ababa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Avatar URL
                  </label>
                  <input
                    name="avatar_url"
                    value={formData.avatar_url}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Role: {profile?.role || "doctor"} | Status:{" "}
                {profile?.role_status || "pending"}
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Doctor Professional Details (doctor_profiles table)
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Headline *
                </label>
                <input
                  name="headline"
                  value={formData.headline}
                  onChange={handleChange}
                  maxLength={160}
                  required
                  className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="e.g., Maternal-Fetal Specialist"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bio *
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={5}
                  required
                  className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Describe your experience and care approach"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Specialties *
                  </label>
                  <input
                    name="specialties"
                    value={formData.specialties}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="OBGYN, Prenatal Care"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Languages *
                  </label>
                  <input
                    name="languages"
                    value={formData.languages}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="English, Amharic"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Years of Experience *
                  </label>
                  <input
                    type="number"
                    min={0}
                    name="years_of_experience"
                    value={formData.years_of_experience}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Hospital Affiliation
                  </label>
                  <input
                    name="hospital_affiliation"
                    value={formData.hospital_affiliation}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Verification Documents * (stored in profiles.extra)
              </label>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleVerificationDocsChange}
                className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Upload license/ID or any professional verification documents.
              </p>

              {existingDocUrls.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    Existing uploaded documents
                  </p>
                  {existingDocUrls.map((url, index) => (
                    <a
                      key={`${url}-${index}`}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-primary dark:text-secondary hover:underline"
                    >
                      Verification document {index + 1}
                    </a>
                  ))}
                </div>
              )}

              {verificationDocs.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    New documents to upload
                  </p>
                  {verificationDocs.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300"
                    >
                      <span className="truncate pr-2">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeSelectedDoc(index)}
                        className="text-red-600 dark:text-red-400 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full md:w-auto px-6 py-2 rounded-lg bg-primary hover:bg-primary/90 dark:bg-secondary dark:hover:bg-secondary/90 text-white font-medium disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save and Continue"}
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
};

export default DoctorProfileCompletionPage;
