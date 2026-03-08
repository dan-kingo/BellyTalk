import React from "react";

type SkeletonBlockProps = {
  className: string;
};

const SkeletonBlock: React.FC<SkeletonBlockProps> = ({ className }) => (
  <div
    className={`animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700 ${className}`}
  />
);

export const AppShellSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
    <div className="fixed inset-x-0 top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-9 w-9 lg:hidden" />
          <SkeletonBlock className="h-7 w-44" />
        </div>
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-5 w-28 hidden md:block" />
          <SkeletonBlock className="h-8 w-16 hidden md:block" />
          <SkeletonBlock className="h-9 w-9" />
          <SkeletonBlock className="h-9 w-9" />
        </div>
      </div>
    </div>

    <div className="flex pt-16">
      <aside className="hidden lg:block w-64 h-[calc(100vh-4rem)] border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <div className="space-y-3 pt-8">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-11 w-full" />
          ))}
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 lg:ml-0">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="space-y-3">
            <SkeletonBlock className="h-8 w-56" />
            <SkeletonBlock className="h-4 w-72" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-3"
              >
                <SkeletonBlock className="h-6 w-2/3" />
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-5/6" />
                <SkeletonBlock className="h-24 w-full" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  </div>
);

export const DashboardPageSkeleton: React.FC = () => (
  <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="space-y-2">
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="h-4 w-64" />
      </div>
      <SkeletonBlock className="h-10 w-40" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6"
        >
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-10 w-20 mt-3" />
          <SkeletonBlock className="h-4 w-36 mt-4" />
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Array.from({ length: 2 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6"
        >
          <SkeletonBlock className="h-6 w-40 mb-6" />
          <SkeletonBlock className="h-48 w-full" />
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <SkeletonBlock className="h-6 w-36" />
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-4 w-full" />
        ))}
      </div>
      <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
        <SkeletonBlock className="h-6 w-44" />
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-12 w-full" />
        ))}
      </div>
    </div>
  </div>
);

export const ContentPageSkeleton: React.FC = () => (
  <div className="max-w-7xl mx-auto space-y-6">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <SkeletonBlock className="h-8 w-64" />
      <SkeletonBlock className="h-10 w-36" />
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <SkeletonBlock className="h-10 w-full" />
      <SkeletonBlock className="h-10 w-full" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-3"
        >
          <SkeletonBlock className="h-6 w-3/4" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-5/6" />
          <SkeletonBlock className="h-4 w-2/3" />
          <SkeletonBlock className="h-8 w-full mt-4" />
        </div>
      ))}
    </div>
  </div>
);

export const HospitalsPageSkeleton: React.FC = () => (
  <div className="max-w-7xl mx-auto space-y-6">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <SkeletonBlock className="h-8 w-44" />
      <SkeletonBlock className="h-10 w-36" />
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <SkeletonBlock className="h-10 w-full" />
      <SkeletonBlock className="h-10 w-full" />
      <SkeletonBlock className="h-10 w-full" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-3"
        >
          <SkeletonBlock className="h-6 w-2/3" />
          <SkeletonBlock className="h-4 w-1/3" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-5/6" />
          <SkeletonBlock className="h-4 w-2/3" />
          <SkeletonBlock className="h-8 w-full mt-4" />
        </div>
      ))}
    </div>
  </div>
);

export const RoleRequestsPageSkeleton: React.FC = () => (
  <div className="max-w-7xl mx-auto space-y-6">
    <div className="space-y-2 mb-8">
      <SkeletonBlock className="h-8 w-52" />
      <SkeletonBlock className="h-4 w-72" />
    </div>

    {Array.from({ length: 4 }).map((_, index) => (
      <div
        key={index}
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6"
      >
        <div className="space-y-3">
          <SkeletonBlock className="h-6 w-1/3" />
          <SkeletonBlock className="h-4 w-1/2" />
          <SkeletonBlock className="h-4 w-1/4" />
          <div className="flex gap-3 pt-2">
            <SkeletonBlock className="h-10 w-28" />
            <SkeletonBlock className="h-10 w-28" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const UsersPageSkeleton: React.FC = () => (
  <div className="max-w-7xl mx-auto space-y-6">
    <div className="space-y-2 mb-2">
      <SkeletonBlock className="h-8 w-64" />
      <SkeletonBlock className="h-4 w-64" />
    </div>

    <SkeletonBlock className="h-12 w-full" />

    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="grid grid-cols-6 gap-3 py-3">
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-3/4" />
          <SkeletonBlock className="h-4 w-3/4" />
          <SkeletonBlock className="h-4 w-2/3" />
          <SkeletonBlock className="h-4 w-8 ml-auto" />
        </div>
      ))}
    </div>
  </div>
);
