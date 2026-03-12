import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import { Content, Hospital, Product } from "../types";
import { BookOpen, Building2, ArrowRight, ShoppingBag } from "lucide-react";
import Dialog from "../components/common/Dialog";
import { useDashboardStore } from "../stores/dashboard.store";
import Skeleton from "../components/common/Skeleton";

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
  const renderDoctorDashboard = () => renderMotherDashboard();

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
