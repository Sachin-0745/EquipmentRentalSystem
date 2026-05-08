import React from 'react';

/**
 * Standard pagination controls for Admin sub-components
 */
export default function AdminPagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, hasNextPage, hasPrevPage } = pagination;

  return (
    <div className="flex items-center justify-between mt-8 pt-6 border-t dark:border-gray-800">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Page <span className="font-bold text-gray-800 dark:text-gray-200">{page}</span> of <span className="font-bold text-gray-800 dark:text-gray-200">{totalPages}</span>
      </div>
      <div className="flex gap-2">
        <button
          disabled={!hasPrevPage}
          onClick={() => onPageChange(page - 1)}
          className="px-4 py-2 rounded-xl border dark:border-gray-700 font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300"
        >
          ← Previous
        </button>
        <button
          disabled={!hasNextPage}
          onClick={() => onPageChange(page + 1)}
          className="px-4 py-2 rounded-xl border dark:border-gray-700 font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
