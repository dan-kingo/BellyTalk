import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Stethoscope, MapPin, Languages, Dot } from "lucide-react";
import Layout from "../components/layout/Layout";
import Skeleton from "../components/common/Skeleton";
import { doctorDiscoveryService } from "../services/doctor-discovery.service";
import { DoctorDirectoryItem } from "../types";

const DoctorsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<DoctorDirectoryItem[]>([]);
  const [query, setQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadDoctors = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await doctorDiscoveryService.listDoctors({
          specialty: specialtyFilter || undefined,
          limit: 50,
        });
        if (mounted) {
          setDoctors(data);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.response?.data?.error || "Failed to load doctors.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDoctors();
    return () => {
      mounted = false;
    };
  }, [specialtyFilter]);

  const filteredDoctors = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return doctors;

    return doctors.filter((doctor) => {
      const haystack = [
        doctor.full_name,
        doctor.headline,
        doctor.bio,
        doctor.hospital_affiliation,
        ...(doctor.specialties || []),
        ...(doctor.languages || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [doctors, query]);

  const uniqueSpecialties = useMemo(() => {
    const bucket = new Set<string>();
    doctors.forEach((doctor) => {
      (doctor.specialties || []).forEach((specialty) => {
        if (specialty?.trim()) {
          bucket.add(specialty.trim());
        }
      });
    });
    return Array.from(bucket).sort((a, b) => a.localeCompare(b));
  }, [doctors]);

  const renderStatus = (doctor: DoctorDirectoryItem) => {
    const isOnline = doctor.status === "online";
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
          isOnline
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
        }`}
      >
        <Dot className="-ml-1 mr-0.5 h-4 w-4" />
        {isOnline ? "Online" : "Offline"}
      </span>
    );
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Find a Doctor
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Browse approved doctors and choose a service that matches your care
            needs.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="md:col-span-2 relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, specialty, language..."
                className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </label>

            <select
              value={specialtyFilter}
              onChange={(event) => setSpecialtyFilter(event.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none ring-primary-500 transition focus:ring-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">All specialties</option>
              {uniqueSpecialties.map((specialty) => (
                <option key={specialty} value={specialty}>
                  {specialty}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
              >
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-4/5" />
                <Skeleton className="mt-5 h-9 w-28" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
            <Stethoscope className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              No doctors found
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Try changing the search keyword or specialty filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredDoctors.map((doctor) => (
              <article
                key={doctor.user_id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {doctor.full_name || `Dr. ${doctor.user_id.slice(0, 8)}`}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      {doctor.headline || "General consultation and support"}
                    </p>
                  </div>
                  {renderStatus(doctor)}
                </div>

                {doctor.specialties && doctor.specialties.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {doctor.specialties.slice(0, 4).map((specialty) => (
                      <span
                        key={specialty}
                        className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  {doctor.hospital_affiliation && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{doctor.hospital_affiliation}</span>
                    </div>
                  )}
                  {doctor.languages && doctor.languages.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Languages className="h-4 w-4" />
                      <span>{doctor.languages.join(", ")}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => navigate(`/doctors/${doctor.user_id}`)}
                  className="mt-5 w-full cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
                >
                  View Services & Book
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DoctorsListPage;
