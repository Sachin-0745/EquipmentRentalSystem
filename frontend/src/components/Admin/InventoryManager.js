import React from "react";
import EmptyState from "../EmptyState";
import { TableRowSkeleton } from "../Skeleton";

export default function InventoryManager({ equipmentList, loading, triggerEdit, handleDelete }) {
  return (
    <div>
       <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Manage Inventory</h2>
       {loading ? (
         <div className="overflow-x-auto">
           <table className="w-full text-left text-sm">
             <tbody className="divide-y dark:divide-gray-800">
               <TableRowSkeleton columns={5}/><TableRowSkeleton columns={5}/><TableRowSkeleton columns={5}/>
             </tbody>
           </table>
         </div>
       ) : equipmentList.length === 0 ? (
         <EmptyState icon="📦" title="No equipment found" message="There is no equipment in the system." />
       ) : (
         <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white dark:bg-gray-900 text-left text-sm text-gray-500 dark:text-gray-400">
               <thead className="bg-gray-50 dark:bg-gray-800">
                 <tr>
                   <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Equipment</th>
                   <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Owner & Store</th>
                   <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Price / Day</th>
                   <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Stock Qty</th>
                   <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800">
                 {equipmentList.map(item => (
                   <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                     <td className="px-6 py-4">
                       <div className="flex gap-4 items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center overflow-hidden border dark:border-gray-600">
                             {item.image ? (
                               <img src={(item.image && item.image.startsWith("http") ? item.image : `http://localhost:5000${item.image}`)} alt={item.name} className="h-full w-full object-contain" />
                             ) : (
                               <span className="text-gray-400">📷</span>
                             )}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">{item.name}</div>
                            <div className="text-xs text-gray-400 capitalize">{item.category}</div>
                          </div>
                       </div>
                     </td>
                     <td className="px-6 py-4">
                       <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{item.shop_name || 'EquipRent Official Store'}</div>
                       {item.store_address && <div className="text-xs text-gray-500 truncate max-w-[200px]" title={item.store_address}>📍 {item.store_address}</div>}
                     </td>
                     <td className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">₹{item.price}</td>
                     <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${item.quantity > 0 ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                          {item.quantity} available
                        </span>
                     </td>
                     <td className="px-6 py-4">
                       <div className="flex gap-3">
                         <button onClick={() => triggerEdit(item)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold underline">Edit</button>
                         <button onClick={() => handleDelete(item.id)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold underline">Delete</button>
                       </div>
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
