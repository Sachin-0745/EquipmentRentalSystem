import React from "react";
import EmptyState from "../EmptyState";
import { TableRowSkeleton } from "../Skeleton";

export default function GlobalRentals({ rentalsList, loading, handleMarkPickedUp }) {
  return (
    <div>
       <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Global Rentals Activity</h2>
       {loading ? (
         <div className="overflow-x-auto">
           <table className="w-full text-left text-sm">
             <tbody className="divide-y dark:divide-gray-800">
               <TableRowSkeleton columns={5}/><TableRowSkeleton columns={5}/><TableRowSkeleton columns={5}/>
             </tbody>
           </table>
         </div>
       ) : rentalsList.length === 0 ? (
         <EmptyState icon="🌍" title="No rentals found" message="No rentals found across the platform." />
       ) : (
         <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white dark:bg-gray-900 text-left text-sm text-gray-500 dark:text-gray-400 transition-colors">
               <thead className="bg-gray-50 dark:bg-gray-800">
                 <tr>
                   <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">User / Email</th>
                   <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Equipment</th>
                   <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Lease Window</th>
                   <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Tracking Status</th>
                   <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800">
                 {rentalsList.map(item => (
                   <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 dark:text-white">{item.user_name || 'Verified User'}</div>
                        <div className="text-xs text-gray-400">{item.user_email}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700 dark:text-gray-200">
                        {item.equipment_name} (x{item.quantity})
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-tighter">Vendor: {item.vendor_shop_name || 'Admin'}</div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold dark:text-gray-300">
                        {item.start_date && item.end_date ? `${new Date(item.start_date).toLocaleDateString()} to ${new Date(item.end_date).toLocaleDateString()}` : `${item.days} Days`}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">{item.delivery_status || 'Pending'}</div>
                        {item.delivery_type === 'delivery' ? (
                           <div className="text-[10px] text-gray-500 dark:text-gray-500 mt-1">Driver: {item.driver_name || 'Unassigned'}</div>
                        ) : (
                           <div className="text-[10px] text-gray-500 dark:text-gray-500 mt-1">Self Pickup</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${item.status === 'returned' || item.status === 'cancelled' ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                          {item.status}
                        </span>
                        {item.delivery_type === 'pickup' && item.delivery_status === 'ready_for_pickup' && (
                           <div className="mt-2">
                              <button onClick={() => handleMarkPickedUp(item.id)} className="text-xs bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-1 px-2 rounded shadow-sm transition">
                                Mark Picked Up
                              </button>
                           </div>
                        )}
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
