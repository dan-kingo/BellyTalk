import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { contentService } from '../services/content.service';
import { hospitalService } from '../services/hospital.service';
import { Content, Hospital } from '../types';
import { BookOpen, Building2, ArrowRight } from 'lucide-react';
import Dialog from '../components/common/Dialog';

const DashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [contents, setContents] = useState<Content[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
const [viewingContent, setViewingContent] = useState<Content | null>(null);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | 'delete' | 'view'>('add');
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleViewContent = (content: Content) => {
      setViewingContent(content);
      setDialogMode('view');
      setShowDialog(true);
    };
     const canManageContent = profile?.role === 'doctor' || profile?.role === 'counselor' || profile?.role === 'admin';
   const canManageHospitals =
    profile?.role === "doctor" ||
    profile?.role === "counselor" ||
    profile?.role === "admin";
const loadDashboardData = async () => {
  try {
    setLoading(true);
    
    // Use appropriate services based on user role
    const [contentRes, hospitalRes] = await Promise.all([
      canManageContent ? contentService.getMyContents({ limit: 3 }) : contentService.getAllContent({ limit: 3 }),
      canManageHospitals ? hospitalService.getMyHospitals({ limit: 3 }) : hospitalService.getHospitals({ limit: 3 }),
    ]);
    
    setContents(contentRes.data || []);
    setHospitals(hospitalRes.data || []);
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
  } finally {
    setLoading(false);
  }
};

  if (!profile) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }
  const mother = profile.role === 'mother';
  const doctor = profile.role === 'doctor';

  const renderMotherDashboard = () => (
    <div className="space-y-8">
      <div className="bg-linear-to-r from-primary to-primary-600 dark:from-secondary dark:to-secondary/80 rounded-xl shadow-lg p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">Welcome back, {doctor ? "Dr." : mother ? "Ms." : "Mr."} {profile.full_name}!</h2>
        <p className="text-white/90"> {mother ? "Track your pregnancy journey and stay connected with your care team." : "Manage your patients and stay updated with the latest information."}</p>
      </div>

      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-primary dark:text-secondary" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Educational Content</h3>
          </div>
          <button
            onClick={() => navigate('/content')}
            className="flex cursor-pointer items-center gap-2 text-primary dark:text-secondary hover:gap-3 transition-all"
          >
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {loading ? (
          <div className="text-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             <Dialog
          isOpen={showDialog && dialogMode === 'view'}
          onClose={() => setShowDialog(false)}
          title={viewingContent?.title || 'Content Details'}
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{viewingContent.body}</p>
              </div>
              {viewingContent.category && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Category</h3>
                  <p className="text-gray-600 dark:text-gray-400">{viewingContent.category}</p>
                </div>
              )}
              {viewingContent.tags && viewingContent.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Tags</h3>
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
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Language</h3>
                <p className="text-gray-600 dark:text-gray-400">{viewingContent.language.toUpperCase()}</p>
              </div>
            </div>
          )}
        </Dialog>
             {contents.map((content) => (
              <div
                key={content.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition p-6 border border-gray-100 dark:border-gray-700"
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
                    Category: <span className="font-medium">{content.category}</span>
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
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-primary dark:text-secondary" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Hospitals</h3>
          </div>
          <button
            onClick={() => navigate('/hospitals')}
            className="flex cursor-pointer items-center gap-2 text-primary dark:text-secondary hover:gap-3 transition-all"
          >
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        {loading ? (
          <div className="text-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hospitals.map((hospital) => (
              <div
                key={hospital.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition p-6 border border-gray-100 dark:border-gray-700"
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
        )}
      </section>
    </div>
  );

  const renderCounselorDashboard = () => renderMotherDashboard();
  const renderDoctorDashboard = () => renderMotherDashboard();

  const renderDashboardContent = () => {
    switch (profile.role) {
      case 'mother':
        return renderMotherDashboard();
      case 'counselor':
        return renderCounselorDashboard();
      case 'doctor':
        return renderDoctorDashboard();
      default:
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900">Welcome to BellyTalk</h2>
            <p className="mt-2 text-gray-600">Your dashboard will appear here based on your role.</p>
          </div>
        );
    }
  };

  return (
    <Layout>
      {renderDashboardContent()}
    </Layout>
  );
};

export default DashboardPage;
