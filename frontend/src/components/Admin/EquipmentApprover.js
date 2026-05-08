import React from "react";
import EmptyState from "../EmptyState";
import { TableRowSkeleton } from "../Skeleton";

export default function EquipmentApprover({ pendingEquipmentList, loading, handleEquipmentStatus }) {
  return (
    <div>
       <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Pending Equipment Approvals</h2>
       {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y dark:divide-gray-800">
                <TableRowSkeleton columns={5}/><TableRowSkeleton columns={5}/>
              </tbody>
            </table>
          </div>
       ) : pendingEquipmentList.length === 0 ? (
          <EmptyState icon="✅" title="No pending approvals" message="There are no equipment items waiting for approval." />
       ) : (
         <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white dark:bg-gray-900 text-left text-sm text-gray-500 dark:text-gray-400 transition-colors">
               <thead className="bg-gray-50 dark:bg-gray-800">
                 <tr>
                   <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Equipment</th>
                   <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Vendor Shop</th>
                   <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Price/Qty</th>
                   <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Status</th>
                   <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800">
                 {pendingEquipmentList.map(e => (
                   <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex gap-3">
                           <div className="h-10 w-10 bg-gray-100 dark:bg-gray-700 rounded border dark:border-gray-600 flex items-center justify-center overflow-hidden">
                              {e.image ? (
                                <img src={(e.image && e.image.startsWith("http") ? e.image : `http://localhost:5000${e.image}`)} className="h-full w-full object-contain" alt={e.name}/>
                              ) : (
                                <span className="text-gray-400">📷</span>
                              )}
                           </div>
                           <div>
                             <div className="font-semibold text-gray-900 dark:text-white">{e.name}</div>
                             <div className="text-xs text-gray-400 dark:text-gray-500 capitalize">{e.category}</div>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-indigo-600 dark:text-indigo-400">{e.shop_name}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-gray-300">₹{e.price} <span className="text-gray-400 dark:text-gray-500 text-xs">(Qty: {e.quantity})</span></td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${e.status==='approved'?'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400':e.status==='rejected'?'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400':'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>
                          {e.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        {e.status !== 'approved' && <button onClick={()=>handleEquipmentStatus(e.id, 'approved')} className="text-white bg-green-500 hover:bg-green-600 px-3 py-1 rounded shadow-sm text-xs font-bold transition">Approve</button>}
                        {e.status !== 'rejected' && <button onClick={()=>handleEquipmentStatus(e.id, 'rejected')} className="text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded shadow-sm text-xs font-bold transition">Reject</button>}
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
