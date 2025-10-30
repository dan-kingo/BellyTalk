import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/layout/Navbar';

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-linear-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      <Navbar onMenuClick={() => setMenuOpen(!menuOpen)} />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight">
          <span className="block">Welcome to</span>
          <span className="block text-primary-600 dark:text-primary-400 mt-1">BellyTalk</span>
        </h1>

        <p className="mt-4 max-w-2xl mx-auto text-gray-600 dark:text-gray-300 text-lg sm:text-xl">
          A comprehensive platform connecting mothers, counselors, and doctors for
          prenatal and postnatal care support.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          {user ? (
            <Link
              to="/dashboard"
              className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl text-lg font-semibold shadow-md transition-transform transform hover:-translate-y-1"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-xl text-lg font-semibold shadow-md transition-transform transform hover:-translate-y-1"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-primary-600 dark:text-primary-400 border-2 border-primary-600 dark:border-primary-500 px-8 py-3 rounded-xl text-lg font-semibold transition-transform transform hover:-translate-y-1"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: 'For Mothers',
              description:
                'Access educational content, track your pregnancy journey, and connect with healthcare professionals.',
              icon: (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              ),
            },
            {
              title: 'For Counselors',
              description:
                'Provide support and guidance through secure chat and video consultations with expecting mothers.',
              icon: (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              ),
            },
            {
              title: 'For Doctors',
              description:
                'Manage patient consultations, provide medical advice, and monitor health progress remotely.',
              icon: (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              ),
            },
          ].map(({ title, description, icon }) => (
            <div
              key={title}
              className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-primary-600 dark:text-primary-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {icon}
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
