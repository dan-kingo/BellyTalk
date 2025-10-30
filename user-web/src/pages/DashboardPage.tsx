import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { contentService, EducationalContent } from '../services/content.service';
import { hospitalService, Hospital } from '../services/hospital.service';
import { BookOpen, Building2, ArrowRight } from 'lucide-react';

const DashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [contents, setContents] = useState<EducationalContent[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [contentRes, hospitalRes] = await Promise.all([
        contentService.getAllContent({ limit: 3 }),
        hospitalService.getHospitals({ limit: 3 }),
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

  const renderMotherDashboard = () => (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-primary to-primary-600 dark:from-secondary dark:to-secondary/80 rounded-xl shadow-lg p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">Welcome back, {profile.full_name}!</h2>
        <p className="text-white/90">Track your pregnancy journey and stay connected with your care team.</p>
      </div>

      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-primary dark:text-secondary" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Educational Content</h3>
          </div>
          <button
            onClick={() => navigate('/content')}
            className="flex items-center gap-2 text-primary dark:text-secondary hover:gap-3 transition-all"
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
            {contents.map((content) => (
              <div
                key={content.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition p-6 border border-gray-100 dark:border-gray-700"
              >
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                  {content.title}
                </h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-3 mb-4">
                  {content.body}
                </p>
                {content.tags && content.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {content.tags.slice(0, 2).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
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
            className="flex items-center gap-2 text-primary dark:text-secondary hover:gap-3 transition-all"
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
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {hospital.name}
                </h4>
                {hospital.city && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {hospital.city}
                  </p>
                )}
                {hospital.description && (
                  <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 mb-4">
                    {hospital.description}
                  </p>
                )}
                {hospital.services && hospital.services.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {hospital.services.slice(0, 2).map((service, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs font-medium rounded-full bg-primary/10 dark:bg-secondary/10 text-primary dark:text-secondary"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                )}
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
