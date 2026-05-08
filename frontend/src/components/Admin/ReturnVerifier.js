import React from "react";
import EmptyState from "../EmptyState";
import { TableRowSkeleton } from "../Skeleton";

export default function ReturnVerifier({ returnVerifications, loading, handleVerifyReturn }) {
  return (
    <div>
      <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Global Returns Verification</h2>
      {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y dark:divide-gray-800">
                <TableRowSkeleton columns={4}/><TableRowSkeleton columns={4}/>
              </tbody>
            </table>
          </div>
      ) : returnVerifications.length === 0 ? (
        <EmptyState icon="🔄" title="No returns pending verification" message="All returns have been verified." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white dark:bg-gray-900 text-left text-sm text-gray-500 dark:text-gray-400 transition-colors">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Equipment</th>
                <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Customer & Vendor</th>
                <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Status</th>
                <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Verify</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800">
              {returnVerifications.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex gap-4 items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center overflow-hidden border dark:border-gray-600">
                        {r.image ? (
                          <img src={(r.image && r.image.startsWith("http") ? r.image : `http://localhost:5000${r.image}`)} alt={r.equipment_name} className="h-full w-full object-contain" />
                        ) : (
                          <span className="text-gray-400">📷</span>
                        )}
                      </div>
                      <div className="font-semibold text-gray-900 dark:text-white">{r.equipment_name} (Qty: {r.quantity})</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <div>
                       <div className="text-gray-900 dark:text-gray-200">{r.user_name}</div>
                       <div className="text-[10px] text-gray-500 dark:text-gray-500 uppercase mt-1 tracking-wider">Vendor: {r.vendor_shop_name || 'Admin'}</div>
                     </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                      {r.status.replace(/_/g, ' ')}
                    </span>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-tighter">Method: {r.return_method?.replace('_', ' ')}</div>
                  </td>
                  <td className="px-6 py-4 flex gap-2 flex-col md:flex-row">
                    <button onClick={() => handleVerifyReturn(r.id, 'approve')} className="text-white bg-green-500 hover:bg-green-600 px-3 py-2 rounded-lg shadow-sm text-xs font-bold whitespace-nowrap transition">Approve Return</button>
                    <button onClick={() => handleVerifyReturn(r.id, 'reject')} className="text-white bg-red-500 hover:bg-red-600 px-3 py-2 rounded-lg shadow-sm text-xs font-bold whitespace-nowrap transition">Report Issue</button>
                  </td>
                </tr>
              ))}
            </tbody>
           </table>
         </div>
       )}
    </div>
  );
}
