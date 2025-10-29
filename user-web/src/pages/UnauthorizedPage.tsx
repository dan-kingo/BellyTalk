import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';

const UnauthorizedPage: React.FC = () => {
  return (
    <Layout>
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-red-100">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-8">
          You do not have permission to access this page.
        </p>
        <Link
          to="/dashboard"
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-md text-sm font-medium transition"
        >
          Go to Dashboard
        </Link>
      </div>
    </Layout>
  );
};

export default UnauthorizedPage;
