import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import Layout from "../components/layout/Layout";
import Dialog from "../components/common/Dialog";
import { Content } from "../types";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useContentStore } from "../stores/content.store";
import { toast } from "react-toastify";
import Skeleton from "../components/common/Skeleton";

const PAGE_SIZE = 9;

const ContentPage: React.FC = () => {
  const { profile } = useAuth();
  const contents = useContentStore((state) => state.contents);
  const loading = useContentStore((state) => state.loading);
  const error = useContentStore((state) => state.error) || "";
  const fetchContents = useContentStore((state) => state.fetchContents);
  const createContent = useContentStore((state) => state.createContent);
  const updateContent = useContentStore((state) => state.updateContent);
  const deleteContent = useContentStore((state) => state.deleteContent);
  const clearError = useContentStore((state) => state.clearError);
  const [filters, setFilters] = useState<{
    query?: string;
    lang?: string;
    page?: number;
    limit?: number;
  }>({ page: 1, limit: 10 });
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<
    "add" | "edit" | "delete" | "view"
  >("add");
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [deletingContent, setDeletingContent] = useState<Content | null>(null);
  const [viewingContent, setViewingContent] = useState<Content | null>(null);
  const [savingContent, setSavingContent] = useState(false);
  const [deletingContentLoading, setDeletingContentLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    body: "",
    category: "",
    tags: "",
    language: "en",
    is_published: false,
  });

  const canManageContent =
    profile?.role === "doctor" ||
    profile?.role === "counselor" ||
    profile?.role === "admin";
  const isUserRole = profile?.role === "mother";

  useEffect(() => {
    fetchContents(canManageContent, filters);
  }, [filters, canManageContent, fetchContents]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, query: e.target.value, page: 1 });
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ ...filters, lang: e.target.value, page: 1 });
  };

  const handleLoadMore = () => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      limit: (prev.limit ?? PAGE_SIZE) + PAGE_SIZE,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSavingContent(true);

    try {
      const contentData = {
        ...formData,
        tags: formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };

      if (editingContent) {
        await updateContent(editingContent.id, contentData as any);
        toast.success("Content updated successfully.");
      } else {
        const formData = new FormData();
        formData.append("title", contentData.title);
        formData.append("body", contentData.body);
        formData.append("category", contentData.category);
        formData.append("language", contentData.language);
        formData.append("is_published", String(contentData.is_published));
        contentData.tags.forEach((tag: string) => formData.append("tags", tag));
        await createContent(formData);
        toast.success("Content created successfully.");
      }

      resetForm();
      setShowDialog(false);
    } catch (err: any) {
      console.error("Failed to save content:", err);
      toast.error(err?.response?.data?.error || "Failed to save content.");
    } finally {
      setSavingContent(false);
    }
  };

  const handleAdd = () => {
    setEditingContent(null);
    setFormData({
      title: "",
      body: "",
      category: "",
      tags: "",
      language: "en",
      is_published: false,
    });
    setDialogMode("add");
    setShowDialog(true);
  };

  const handleEdit = (content: Content) => {
    setEditingContent(content);
    setFormData({
      title: content.title,
      body: content.body,
      category: content.category || "",
      tags: content.tags?.join(", ") || "",
      language: content.language,
      is_published: content.is_published,
    });
    setDialogMode("edit");
    setShowDialog(true);
  };

  const handleDeleteClick = (content: Content) => {
    setDeletingContent(content);
    setDialogMode("delete");
    setShowDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingContent) return;
    setDeletingContentLoading(true);

    try {
      await deleteContent(deletingContent.id);
      toast.success("Content deleted successfully.");
      setShowDialog(false);
      setDeletingContent(null);
    } catch (err: any) {
      console.error("Failed to delete content:", err);
      toast.error(err?.response?.data?.error || "Failed to delete content.");
    } finally {
      setDeletingContentLoading(false);
    }
  };

  const handleViewContent = (content: Content) => {
    setViewingContent(content);
    setDialogMode("view");
    setShowDialog(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      body: "",
      category: "",
      tags: "",
      language: "en",
      is_published: false,
    });
    setEditingContent(null);
    setDeletingContent(null);
    setViewingContent(null);
    setShowDialog(false);
  };

  // Helper to check if filters are active
  const hasActiveFilters = filters.query || filters.lang;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Educational Content
          </h1>
          {canManageContent && (
            <button
              onClick={handleAdd}
              className="w-full cursor-pointer sm:w-auto bg-primary hover:bg-primary-700 dark:bg-secondary dark:hover:bg-secondary/90 text-white px-6 py-2 rounded-lg font-medium transition flex items-center gap-2 justify-center"
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
            value={filters.query || ""}
            onChange={handleSearchChange}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary dark:focus:ring-secondary focus:border-transparent"
          />
          <select
            value={filters.lang || ""}
            onChange={handleLanguageChange}
            className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary dark:focus:ring-secondary focus:border-transparent"
          >
            <option value="">All Languages</option>
            <option value="en">English</option>
            <option value="am">Amharic</option>
            <option value="om">Afan Oromo</option>
          </select>
        </div>

        {/* Active Filters Indicator */}
        {hasActiveFilters && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Active filters:
            </span>
            {filters.query && (
              <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                Search: "{filters.query}"
              </span>
            )}
            {filters.lang && (
              <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                Language: {filters.lang.toUpperCase()}
              </span>
            )}
            <button
              onClick={() => setFilters({ page: 1, limit: 10 })}
              className="text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <Dialog
          isOpen={
            showDialog && dialogMode !== "delete" && dialogMode !== "view"
          }
          onClose={resetForm}
          title={editingContent ? "Edit Content" : "Add New Content"}
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
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
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
                onChange={(e) =>
                  setFormData({ ...formData, body: e.target.value })
                }
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
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, language: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary dark:focus:ring-secondary focus:border-transparent"
                >
                  <option value="en">English</option>
                  <option value="am">Amharic</option>
                  <option value="om">Afan Oromo</option>
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
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                placeholder="e.g., health, pregnancy, tips"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary dark:focus:ring-secondary focus:border-transparent"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_published"
                checked={formData.is_published}
                onChange={(e) =>
                  setFormData({ ...formData, is_published: e.target.checked })
                }
                className="h-4 w-4 text-primary dark:text-secondary focus:ring-primary dark:focus:ring-secondary border-gray-300 dark:border-gray-600 rounded"
              />
              <label
                htmlFor="is_published"
                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                Publish immediately
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={savingContent}
                className="flex-1 cursor-pointer bg-primary hover:bg-primary-700 dark:bg-secondary dark:hover:bg-secondary/90 text-white px-6 py-2 rounded-lg font-medium transition"
              >
                {savingContent
                  ? editingContent
                    ? "Updating..."
                    : "Creating..."
                  : editingContent
                    ? "Update Content"
                    : "Create Content"}
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
          isOpen={showDialog && dialogMode === "view"}
          onClose={resetForm}
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

        <Dialog
          isOpen={showDialog && dialogMode === "delete"}
          onClose={resetForm}
          title="Delete Content"
        >
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300">
              Are you sure you want to delete{" "}
              <strong>{deletingContent?.title}</strong>? This action cannot be
              undone.
            </p>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deletingContentLoading}
                className="flex-1 cursor-pointer bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition"
              >
                {deletingContentLoading ? "Deleting..." : "Delete"}
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

        {loading && contents.length === 0 ? (
          <div className="space-y-6 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800"
                >
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full mt-4" />
                  <Skeleton className="h-4 w-5/6 mt-2" />
                  <Skeleton className="h-4 w-4/6 mt-2" />
                  <div className="flex gap-2 mt-5">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <div className="flex gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : contents.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">
              {hasActiveFilters
                ? "No content found matching your filters"
                : "No content found"}
            </p>
            {hasActiveFilters && (
              <button
                onClick={() => setFilters({ page: 1, limit: 10 })}
                className="mt-2 text-primary dark:text-secondary hover:underline"
              >
                Clear filters
              </button>
            )}
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

                <p className="text-gray-700 dark:text-gray-300 mb-3">
                  {content.body.length > 150
                    ? `${content.body.substring(0, 150)}...`
                    : content.body}
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

                {canManageContent && !isUserRole && (
                  <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleEdit(content)}
                      className="flex-1 cursor-pointer px-3 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(content)}
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

        {contents.length > 0 &&
          contents.length >= (filters.limit ?? PAGE_SIZE) && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loading}
                className="px-6 py-2 rounded-lg cursor-pointer bg-primary-600 hover:bg-primary-700 text-white font-medium transition disabled:opacity-60"
              >
                {loading ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
      </div>
    </Layout>
  );
};

export default ContentPage;
