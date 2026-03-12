import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Building2, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/layout/Layout";
import Skeleton from "../components/common/Skeleton";
import Dialog from "../components/common/Dialog";
import { contentService } from "../services/content.service";
import { hospitalService } from "../services/hospital.service";
import { Content, Hospital } from "../types";

const ResourcesPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contents, setContents] = useState<Content[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(
    null,
  );

  const canManage =
    profile?.role === "doctor" ||
    profile?.role === "counselor" ||
    profile?.role === "admin";

  useEffect(() => {
    const loadResources = async () => {
      try {
        setLoading(true);
        const [contentRes, hospitalRes] = await Promise.all([
          canManage
            ? contentService.getMyContents({ page: 1, limit: 6 })
            : contentService.getAllContent({ page: 1, limit: 6 }),
          canManage
            ? hospitalService.getMyHospitals({ page: 1, limit: 6 })
            : hospitalService.getHospitals({ page: 1, limit: 6 }),
        ]);

        setContents((contentRes?.data || []) as Content[]);
        setHospitals((hospitalRes?.data || []) as Hospital[]);
      } catch {
        setContents([]);
        setHospitals([]);
      } finally {
        setLoading(false);
      }
    };

    loadResources();
  }, [canManage]);

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-xl bg-linear-to-r from-primary to-primary-600 p-8 text-white shadow-lg dark:from-secondary dark:to-secondary/80">
          <h1 className="text-3xl font-bold">Resources</h1>
          <p className="mt-2 text-white/90">
            Discover educational content and trusted hospitals in one place.
          </p>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary dark:text-secondary" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Content
              </h2>
            </div>
            <button
              onClick={() => navigate("/content")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:gap-3 dark:text-secondary"
            >
              Open Content <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <Skeleton key={idx} className="h-36 w-full rounded-xl" />
              ))}
            </div>
          ) : contents.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              No content available yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {contents.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-gray-200 p-4 transition hover:border-primary/40 hover:shadow-sm dark:border-gray-700"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedContent(item)}
                    className="w-full text-left"
                  >
                    <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-xs text-gray-600 dark:text-gray-300">
                      {item.body}
                    </p>
                    <p className="mt-3 text-xs font-medium text-primary dark:text-secondary">
                      View details
                    </p>
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary dark:text-secondary" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Hospitals
              </h2>
            </div>
            <button
              onClick={() => navigate("/hospitals")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:gap-3 dark:text-secondary"
            >
              Open Hospitals <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <Skeleton key={idx} className="h-36 w-full rounded-xl" />
              ))}
            </div>
          ) : hospitals.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              No hospitals available yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {hospitals.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-gray-200 p-4 transition hover:border-primary/40 hover:shadow-sm dark:border-gray-700"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedHospital(item)}
                    className="w-full text-left"
                  >
                    <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {item.city || "City not specified"}
                    </p>
                    {item.description && (
                      <p className="mt-2 line-clamp-3 text-xs text-gray-600 dark:text-gray-300">
                        {item.description}
                      </p>
                    )}
                    <p className="mt-3 text-xs font-medium text-primary dark:text-secondary">
                      View details
                    </p>
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <Dialog
          isOpen={Boolean(selectedContent)}
          onClose={() => setSelectedContent(null)}
          title={selectedContent?.title || "Content Details"}
        >
          {selectedContent && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary dark:bg-secondary/20 dark:text-secondary">
                  {selectedContent.category}
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                  {selectedContent.language}
                </span>
              </div>
              <p className="whitespace-pre-line text-sm text-gray-700 dark:text-gray-200">
                {selectedContent.body}
              </p>
            </div>
          )}
        </Dialog>

        <Dialog
          isOpen={Boolean(selectedHospital)}
          onClose={() => setSelectedHospital(null)}
          title={selectedHospital?.name || "Hospital Details"}
        >
          {selectedHospital && (
            <div className="space-y-4 text-sm text-gray-700 dark:text-gray-200">
              <p>
                {selectedHospital.description || "No description provided."}
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    City
                  </p>
                  <p>{selectedHospital.city || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Address
                  </p>
                  <p>{selectedHospital.address || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Phone
                  </p>
                  <p>{selectedHospital.phone || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Email
                  </p>
                  <p>{selectedHospital.email || "Not specified"}</p>
                </div>
              </div>
              {selectedHospital.website && (
                <a
                  href={selectedHospital.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 font-medium text-primary hover:underline dark:text-secondary"
                >
                  Visit Hospital Website <ArrowRight className="h-4 w-4" />
                </a>
              )}
            </div>
          )}
        </Dialog>
      </div>
    </Layout>
  );
};

export default ResourcesPage;
