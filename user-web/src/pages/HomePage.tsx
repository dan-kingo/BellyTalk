import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-20 pb-16 text-center lg:pt-32">
          <h1 className="text-4xl tracking-tight font-bold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Welcome to</span>
            <span className="block text-primary-600">BellyTalk</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            A comprehensive platform connecting mothers, counselors, and doctors for prenatal and postnatal care support.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            {user ? (
              <Link
                to="/dashboard"
                className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-md text-lg font-medium transition"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-md text-lg font-medium transition"
                >
                  Get Started
                </Link>
                <Link
                  to="/login"
                  className="bg-white hover:bg-gray-50 text-primary-600 border-2 border-primary-600 px-8 py-3 rounded-md text-lg font-medium transition"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="mt-20 pb-20">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">For Mothers</h3>
              <p className="text-gray-600">
                Access educational content, track your pregnancy journey, and connect with healthcare professionals.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">For Counselors</h3>
              <p className="text-gray-600">
                Provide support and guidance through secure chat and video consultations with expecting mothers.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">For Doctors</h3>
              <p className="text-gray-600">
                Manage patient consultations, provide medical advice, and monitor health progress remotely.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
