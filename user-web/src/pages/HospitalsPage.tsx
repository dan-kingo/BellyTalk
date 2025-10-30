import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import Dialog from '../components/common/Dialog';
import { hospitalService } from '../services/hospital.service';
import { Hospital } from '../types';
import { Plus, Edit, Trash2 } from 'lucide-react';

const HospitalsPage: React.FC = () => {
  const { profile } = useAuth();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<{ city?: string; service?: string; query?: string; page?: number; limit?: number }>({ page: 1, limit: 10 });
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [deletingHospital, setDeletingHospital] = useState<Hospital | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    services: '',
  });

  const canManageHospitals = profile?.role === 'doctor' || profile?.role === 'counselor' || profile?.role === 'admin';
  const isUserRole = profile?.role === 'mother';

  useEffect(() => {
    loadHospitals();
  }, [filters]);

  const loadHospitals = async () => {
    try {
      setLoading(true);
      const response = await hospitalService.getHospitals(filters);
      setHospitals(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load hospitals');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const hospitalData = {
        ...formData,
        services: formData.services.split(',').map(s => s.trim()).filter(Boolean),
      };

      if (editingHospital) {
        await hospitalService.updateHospital(editingHospital.id, hospitalData);
      } else {
        await hospitalService.createHospital(hospitalData);
      }

      resetForm();
      loadHospitals();
      setShowDialog(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save hospital');
    }
  };

  const handleAdd = () => {
    setEditingHospital(null);
    setFormData({
      name: '',
      description: '',
      city: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      services: '',
    });
    setDialogMode('add');
    setShowDialog(true);
  };

  const handleEdit = (hospital: Hospital) => {
    setEditingHospital(hospital);
    setFormData({
      name: hospital.name,
      description: hospital.description || '',
      city: hospital.city || '',
      address: hospital.address || '',
      phone: hospital.phone || '',
      email: hospital.email || '',
      website: hospital.website || '',
      services: hospital.services?.join(', ') || '',
    });
    setDialogMode('edit');
    setShowDialog(true);
  };

  const handleDeleteClick = (hospital: Hospital) => {
    setDeletingHospital(hospital);
    setDialogMode('delete');
    setShowDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingHospital) return;

    try {
      await hospitalService.deleteHospital(deletingHospital.id);
      loadHospitals();
      setShowDialog(false);
      setDeletingHospital(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete hospital');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      city: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      services: '',
    });
    setEditingHospital(null);
    setDeletingHospital(null);
    setShowDialog(false);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Hospitals</h1>
          {canManageHospitals && (
            <button
              onClick={handleAdd}
              className="w-full cursor-pointer sm:w-auto bg-primary hover:bg-primary-700 dark:bg-secondary dark:hover:bg-secondary/90 text-white px-6 py-2 rounded-lg font-medium transition flex items-center gap-2 justify-center"
            >
              <Plus className="w-5 h-5" />
              Add Hospital
            </button>
          )}
        </div>

        <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search hospitals..."
            value={filters.query || ''}
            onChange={(e) => setFilters({ ...filters, query: e.target.value, page: 1 })}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary dark:focus:ring-secondary focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Filter by city..."
            value={filters.city || ''}
            onChange={(e) => setFilters({ ...filters, city: e.target.value, page: 1 })}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary dark:focus:ring-secondary focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Filter by service..."
            value={filters.service || ''}
            onChange={(e) => setFilters({ ...filters, service: e.target.value, page: 1 })}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary dark:focus:ring-secondary focus:border-transparent"
          />
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <Dialog
          isOpen={showDialog && dialogMode !== 'delete'}
          onClose={resetForm}
          title={editingHospital ? 'Edit Hospital' : 'Add New Hospital'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hospital Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary dark:focus:ring-secondary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary dark:focus:ring-secondary focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary dark:focus:ring-secondary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary dark:focus:ring-secondary focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary dark:focus:ring-secondary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary dark:focus:ring-secondary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary dark:focus:ring-secondary focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Services (comma-separated)
              </label>
              <input
                type="text"
                value={formData.services}
                onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                placeholder="e.g., Maternity, Pediatrics, Emergency"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary dark:focus:ring-secondary focus:border-transparent"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 cursor-pointer bg-primary hover:bg-primary-700 dark:bg-secondary dark:hover:bg-secondary/90 text-white px-6 py-2 rounded-lg font-medium transition"
              >
                {editingHospital ? 'Update Hospital' : 'Create Hospital'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 cursor-pointer py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </Dialog>

        <Dialog
          isOpen={showDialog && dialogMode === 'delete'}
          onClose={resetForm}
          title="Delete Hospital"
        >
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Are you sure you want to delete <strong>{deletingHospital?.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 cursor-pointer bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 cursor-pointer px-6 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </Dialog>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary dark:border-secondary"></div>
          </div>
        ) : hospitals.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">No hospitals found</p>
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
                {canManageHospitals && !isUserRole && (
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleEdit(hospital)}
                      className="flex-1 cursor-pointer px-3 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(hospital)}
                      className="flex-1 cursor-pointer px-3 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default HospitalsPage;
