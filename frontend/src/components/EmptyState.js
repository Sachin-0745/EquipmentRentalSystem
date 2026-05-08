import React from 'react';
import { Link } from 'react-router-dom';

const EmptyState = ({ title, message, actionLabel, actionLink, icon }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl shadow-sm border border-gray-100 my-8">
      <div className="w-24 h-24 mb-6 text-indigo-200 bg-indigo-50 rounded-full flex items-center justify-center text-4xl">
        {icon || '📭'}
      </div>
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-500 max-w-md mb-8">{message}</p>
      
      {actionLabel && actionLink && (
        <Link
          to={actionLink}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
          aria-label={actionLabel}
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
};

export default EmptyState;
