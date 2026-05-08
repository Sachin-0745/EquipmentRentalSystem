import React from "react";
import EmptyState from "../EmptyState";
import { TableRowSkeleton } from "../Skeleton";

export default function DeliveryVerifier({ deliveryList, loading, handleDeliveryStatus }) {
  return (
    <div>
       <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Verify Delivery Drivers</h2>
       {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y dark:divide-gray-800">
                <TableRowSkeleton columns={4}/><TableRowSkeleton columns={4}/>
              </tbody>
            </table>
          </div>
       ) : deliveryList.length === 0 ? (
          <EmptyState icon="🚚" title="No delivery drivers found" message="No delivery drivers have registered yet." />
       ) : (
         <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white dark:bg-gray-900 text-left text-sm text-gray-500 dark:text-gray-400 transition-colors">
               <thead className="bg-gray-50 dark:bg-gray-800">
                 <tr>
                   <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Details</th>
                   <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Vehicle & City</th>
                   <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Status</th>
                   <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800">
                 {deliveryList.map(v => (
                   <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-gray-900 dark:text-white font-bold">{v.name}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">{v.email} | {v.mobile_no}</div>
                        {v.document_url && (
                          <a href={(v.document_url && v.document_url.startsWith("http") ? v.document_url : `http://localhost:5000${v.document_url}`)} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline mt-1 block">📄 View Document</a>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 dark:text-gray-200 text-xs uppercase tracking-tighter">{v.city}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">{v.vehicle_details}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${v.delivery_status==='approved'?'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400':v.delivery_status==='rejected'?'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400':'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>
                          {v.delivery_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        {v.delivery_status !== 'approved' && <button onClick={()=>handleDeliveryStatus(v.id, 'approved')} className="text-white bg-green-500 hover:bg-green-600 px-3 py-1 rounded shadow-sm text-xs font-bold transition">Approve</button>}
                        {v.delivery_status !== 'rejected' && <button onClick={()=>handleDeliveryStatus(v.id, 'rejected')} className="text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded shadow-sm text-xs font-bold transition">Reject</button>}
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
