import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { adminService } from '../services/admin.service';
import { RoleRequest } from '../types';
import { CheckCircle, XCircle, FileText } from 'lucide-react';

const RoleRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectUserId, setRejectUserId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await adminService.listRoleRequests();
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Failed to load role requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      setProcessing(userId);
      await adminService.approveRole(userId);
      setRequests(requests.filter(r => r.id !== userId));
    } catch (error) {
      console.error('Failed to approve request:', error);
      alert('Failed to approve request');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectUserId) return;

    try {
      setProcessing(rejectUserId);
      await adminService.rejectRole(rejectUserId, rejectReason);
      setRequests(requests.filter(r => r.id !== rejectUserId));
      setShowRejectDialog(false);
      setRejectUserId(null);
      setRejectReason('');
    } catch (error) {
      console.error('Failed to reject request:', error);
      alert('Failed to reject request');
    } finally {
      setProcessing(null);
    }
  };

  const openRejectDialog = (userId: string) => {
    setRejectUserId(userId);
    setShowRejectDialog(true);
  };

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Role Requests</h1>
          <p className="text-gray-600 dark:text-gray-400">Review and approve role upgrade requests</p>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-md">
            <FileText className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No pending role requests</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {request.full_name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Email: {request.email}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Requested Role: <span className="font-medium text-primary dark:text-secondary">{request.requested_role}</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Submitted: {new Date(request.submitted_at).toLocaleString()}
                    </p>

                    {request.documents && request.documents.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Documents:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {request.documents.map((doc, idx) => (
                            <a
                              key={idx}
                              href={doc}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/40 transition"
                            >
                              Document {idx + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={processing === request.id}
                      className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Approve
                    </button>
                    <button
                      onClick={() => openRejectDialog(request.id)}
                      disabled={processing === request.id}
                      className="flex items-center gap-2 cursor-pointer px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-5 h-5" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showRejectDialog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Reject Role Request
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rejection Reason
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Provide a reason for rejection..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRejectDialog(false);
                    setRejectUserId(null);
                    setRejectReason('');
                  }}
                  className="flex-1 px-4 cursor-pointer py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim()}
                  className="flex-1 px-4 cursor-pointer py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reject Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RoleRequestsPage;
