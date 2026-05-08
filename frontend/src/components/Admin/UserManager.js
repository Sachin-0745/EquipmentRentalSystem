import React from "react";
import EmptyState from "../EmptyState";
import { TableRowSkeleton } from "../Skeleton";
import AdminPagination from "./AdminPagination";

export default function UserManager({ usersList, loading, pagination, fetchData, handleDeleteUser }) {
  return (
    <div>
       <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Manage Users</h2>
       {loading ? (
         <div className="overflow-x-auto">
           <table className="w-full text-left text-sm">
             <tbody className="divide-y dark:divide-gray-800">
               <TableRowSkeleton columns={5}/><TableRowSkeleton columns={5}/><TableRowSkeleton columns={5}/>
             </tbody>
           </table>
         </div>
       ) : usersList.length === 0 ? (
         <EmptyState icon="👥" title="No users found" message="No users have registered yet." />
       ) : (
         <>
           <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white dark:bg-gray-900 text-left text-sm text-gray-500 dark:text-gray-400 transition-colors">
                 <thead className="bg-gray-50 dark:bg-gray-800">
                   <tr>
                     <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Name</th>
                     <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Email</th>
                     <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Mobile</th>
                     <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Role / Status</th>
                     <th scope="col" className="px-6 py-4 font-bold text-gray-900 dark:text-white">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800">
                   {usersList.map(user => (
                     <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{user.name}</td>
                        <td className="px-6 py-4 dark:text-gray-300">{user.email}</td>
                        <td className="px-6 py-4 dark:text-gray-300">{user.mobile_no}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase mr-2 ${user.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                            {user.role}
                          </span>
                          {user.is_verified ? (
                            <span className="text-xs text-green-600 dark:text-green-400 font-bold">Verified</span>
                          ) : (
                            <span className="text-xs text-red-500 dark:text-red-400">Unverified</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {user.role !== 'admin' ? (
                            <button onClick={() => handleDeleteUser(user.id)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold underline">Delete</button>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-600 font-semibold text-xs uppercase cursor-not-allowed tracking-wider">Protected</span>
                          )}
                        </td>
                     </tr>
                   ))}
                 </tbody>
              </table>
           </div>
           <AdminPagination pagination={pagination} onPageChange={fetchData} />
         </>
       )}
    </div>
  );
}
