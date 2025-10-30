import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import Dialog from '../components/common/Dialog';
import { contentService, EducationalContent, ContentFilters } from '../services/content.service';
import { Plus, Edit, Trash2 } from 'lucide-react';

const ContentPage: React.FC = () => {
  const { profile } = useAuth();
  const [contents, setContents] = useState<EducationalContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<ContentFilters>({ page: 1, limit: 10 });
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | 'delete'>('add');
  const [editingContent, setEditingContent] = useState<EducationalContent | null>(null);
  const [deletingContent, setDeletingContent] = useState<EducationalContent | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    category: '',
    tags: '',
    language: 'en',
    is_published: false,
  });

  const canManageContent = profile?.role === 'doctor' || profile?.role === 'counselor' || profile?.role === 'admin';

  useEffect(() => {
    loadContent();
  }, [filters]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const response = await contentService.getAllContent(filters);
      setContents(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const contentData = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
      };

      if (editingContent) {
        await contentService.updateContent(editingContent.id, contentData);
      } else {
        await contentService.createContent(contentData);
      }

      resetForm();
      loadContent();
      setShowDialog(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save content');
    }
  };

  const handleAdd = () => {
    setEditingContent(null);
    setFormData({
      title: '',
      body: '',
      category: '',
      tags: '',
      language: 'en',
      is_published: false,
    });
    setDialogMode('add');
    setShowDialog(true);
  };

  const handleEdit = (content: EducationalContent) => {
    setEditingContent(content);
    setFormData({
      title: content.title,
      body: content.body,
      category: content.category || '',
      tags: content.tags?.join(', ') || '',
      language: content.language,
      is_published: content.is_published,
    });
    setDialogMode('edit');
    setShowDialog(true);
  };

  const handleDeleteClick = (content: EducationalContent) => {
    setDeletingContent(content);
    setDialogMode('delete');
    setShowDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingContent) return;

    try {
      await contentService.deleteContent(deletingContent.id);
      loadContent();
      setShowDialog(false);
      setDeletingContent(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete content');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      body: '',
      category: '',
      tags: '',
      language: 'en',
      is_published: false,
    });
    setEditingContent(null);
    setDeletingContent(null);
    setShowDialog(false);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Educational Content</h1>
          {canManageContent && (
            <button
              onClick={handleAdd}
              className="w-full sm:w-auto bg-primary hover:bg-primary-700 dark:bg-secondary dark:hover:bg-secondary/90 text-white px-6 py-2 rounded-lg font-medium transition flex items-center gap-2 justify-center"
            >
              <Plus className="w-5 h-5" />
              Add Content
            </button>
          )}
        </div>

        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Search content..."
            value={filters.query || ''}
            onChange={(e) => setFilters({ ...filters, query: e.target.value, page: 1 })}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary dark:focus:ring-secondary focus:border-transparent"
          />
          <select
            value={filters.lang || ''}
            onChange={(e) => setFilters({ ...filters, lang: e.target.value, page: 1 })}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary dark:focus:ring-secondary focus:border-transparent"
          >
            <option value="">All Languages</option>
            <option value="en">English</option>
            <option value="ar">Arabic</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <Dialog
          isOpen={showDialog && dialogMode !== 'delete'}
          onClose={resetForm}
          title={editingContent ? 'Edit Content' : 'Add New Content'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary dark:focus:ring-secondary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Body *
              </label>
              <textarea
                required
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                rows={8}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary dark:focus:ring-secondary focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Pregnancy, Nutrition"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary dark:focus:ring-secondary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Language *
                </label>
                <select
                  required
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary dark:focus:ring-secondary focus:border-transparent"
                >
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g., health, pregnancy, tips"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary dark:focus:ring-secondary focus:border-transparent"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_published"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="h-4 w-4 text-primary dark:text-secondary focus:ring-primary dark:focus:ring-secondary border-gray-300 dark:border-gray-600 rounded"
              />
              <label htmlFor="is_published" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Publish immediately
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary-700 dark:bg-secondary dark:hover:bg-secondary/90 text-white px-6 py-2 rounded-lg font-medium transition"
              >
                {editingContent ? 'Update Content' : 'Create Content'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </Dialog>

        <Dialog
          isOpen={showDialog && dialogMode === 'delete'}
          onClose={resetForm}
          title="Delete Content"
        >
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Are you sure you want to delete <strong>{deletingContent?.title}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-6 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition"
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
        ) : contents.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">No content found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

                {canManageContent && (
                  <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleEdit(content)}
                      className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(content)}
                      className="flex-1 px-3 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
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

export default ContentPage;
