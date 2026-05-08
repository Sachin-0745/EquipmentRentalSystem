import React from "react";
import EmptyState from "../EmptyState";
import { TableRowSkeleton } from "../Skeleton";

export default function UpdateRequestManager({ updateRequestsList, loading, handleUpdateRequest }) {
  return (
    <div>
      <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Vendor Change Requests</h2>
      {loading ? (
         <div className="overflow-x-auto">
           <table className="w-full text-left text-sm">
             <tbody className="divide-y dark:divide-gray-800">
               <TableRowSkeleton columns={6}/>
             </tbody>
           </table>
         </div>
      ) : updateRequestsList.length === 0 ? (
        <EmptyState icon="📝" title="No vendor requests" message="No pending vendor change requests." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white dark:bg-gray-900 text-left text-sm text-gray-500 dark:text-gray-400 transition-colors">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Vendor / Shop</th>
                <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Product</th>
                <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Request Type</th>
                <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Proposed Changes</th>
                <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Submitted</th>
                <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800">
              {updateRequestsList.map(r => {
                const upd = r.updated_data
                  ? (typeof r.updated_data === 'string' ? JSON.parse(r.updated_data) : r.updated_data)
                  : {};
                return (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{r.vendor_name}</div>
                      <div className="text-xs text-indigo-600 dark:text-indigo-400">{r.shop_name}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300">{r.product_name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${r.request_type === 'delete' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                        {r.request_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400">
                      {r.request_type === 'delete'
                        ? <span className="text-red-500 dark:text-red-400 font-bold tracking-tight">⚠️ Delete product entirely</span>
                        : (
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] min-w-[200px]">
                            <div className="font-bold text-gray-500 dark:text-gray-500 border-b dark:border-gray-700 pb-1 uppercase">Current</div>
                            <div className="font-bold text-blue-500 dark:text-blue-400 border-b dark:border-gray-700 pb-1 uppercase">Proposed</div>
                            
                            {upd.price && (
                              <>
                                <div className="line-through text-gray-400">₹{r.original_price || 'N/A'}</div>
                                <div className="text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 px-1 rounded inline-block w-fit">₹{upd.price}</div>
                              </>
                            )}
                            {upd.quantity && (
                              <>
                                <div className="line-through text-gray-400">{r.original_quantity || 'N/A'} units</div>
                                <div className="text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 px-1 rounded inline-block w-fit">{upd.quantity} units</div>
                              </>
                            )}
                            {upd.description && (
                              <>
                                <div className="text-gray-400 dark:text-gray-500 italic line-clamp-2" title={r.original_description}>{r.original_description || 'None'}</div>
                                <div className="text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 p-1 rounded line-clamp-2" title={upd.description}>{upd.description}</div>
                              </>
                            )}
                            {!upd.price && !upd.quantity && !upd.description && <div className="col-span-2 text-gray-400 text-center py-2 italic tracking-widest">No specific changes</div>}
                          </div>
                        )
                      }
                    </td>
                    <td className="px-6 py-4 text-xs dark:text-gray-400">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateRequest(r.id, 'approved')}
                          className="bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition"
                        >Approve</button>
                        <button
                          onClick={() => handleUpdateRequest(r.id, 'rejected')}
                          className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition"
                        >Reject</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
