import React from 'react';

export const Skeleton = ({ className = '', style = {} }) => {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

export const CardSkeleton = () => (
  <div className="bg-white p-4 rounded-xl shadow border border-gray-100 flex flex-col gap-4">
    <Skeleton className="h-48 w-full rounded-lg" />
    <Skeleton className="h-6 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
    <div className="flex justify-between items-center mt-2">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-8 w-1/4 rounded-full" />
    </div>
  </div>
);

export const TableRowSkeleton = ({ columns = 4 }) => (
  <tr className="border-b">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="p-4">
        <Skeleton className="h-4 w-full" />
      </td>
    ))}
  </tr>
);
