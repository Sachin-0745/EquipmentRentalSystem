import React from "react";
import EmptyState from "../EmptyState";

export default function OrderManager({ rentalRequests, loading, handleOwnerApproval, deliveryBoys, handleAssignDriver }) {
  return (
    <div>
       <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Pending Orders (Admin Equipment)</h2>
       {loading ? (
         <div className="flex items-center justify-center py-12">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
           <span className="ml-3 text-gray-500 dark:text-gray-400">Loading requests...</span>
         </div>
       ) : rentalRequests.length === 0 ? (
         <EmptyState icon="📦" title="No pending orders" message="There are no pending orders for admin equipment." />
       ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rentalRequests.map(r => {
              const eq = r.equipment_id || {};
              const user = r.user_id || {};
              
              return (
                <div key={r.id} className="border dark:border-gray-800 p-4 rounded-xl bg-white dark:bg-gray-800/50 shadow-sm flex flex-col items-center text-center transition-colors">
                  {eq.image ? (
                    <img src={(eq.image.startsWith("http") ? eq.image : `http://localhost:5000${eq.image}`)} alt={eq.name} className="h-24 w-24 object-contain mb-3 rounded-lg bg-gray-50 dark:bg-gray-700 p-1" />
                  ) : (
                    <div className="h-24 w-24 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-3 text-2xl">📦</div>
                  )}
                  
                  <h3 className="font-bold text-lg mb-1 dark:text-white line-clamp-1" title={eq.name}>{eq.name || "Unknown Item"}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-widest font-semibold">{r.delivery_city || "Anywhere"}</p>
                  
                  <div className="flex items-center gap-2 mb-2 justify-center">
                    <span className="text-xs font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Qty: {r.quantity}</span>
                    <span className="text-xs font-black bg-green-100 text-green-700 px-2 py-0.5 rounded">₹{r.total_price}</span>
                  </div>

                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{new Date(r.start_date).toLocaleDateString()} to {new Date(r.end_date).toLocaleDateString()}</p>
                  
                  <div className="w-full bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg mb-3 shadow-inner text-xs text-gray-700 dark:text-gray-300 border dark:border-gray-800">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-gray-400 uppercase text-[9px]">Customer:</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-200">{user.name || "Unknown"}</span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-gray-400 uppercase text-[9px]">Payment:</span>
                      <span className={`font-black ${r.payment_status === 'paid' ? 'text-green-600' : 'text-orange-500'}`}>{r.payment_status?.toUpperCase() || "PENDING"}</span>
                    </div>
                    <span className="font-bold block mt-1 text-gray-400 uppercase text-[9px] text-left">Address:</span>
                    <div className="text-left line-clamp-1" title={r.delivery_address}>{r.delivery_address}</div>
                  </div>

                  <div className="flex flex-col gap-2 w-full mt-auto">
                    {r.status === "pending" && (
                      <div className="flex gap-2 w-full">
                        <button onClick={()=>handleOwnerApproval(r.id, 'approved')} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg shadow transition">Approve</button>
                        <button onClick={()=>handleOwnerApproval(r.id, 'rejected')} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg shadow transition">Reject</button>
                      </div>
                    )}
                    {r.status === "approved" && r.delivery_type === 'delivery' && (
                       <div className="w-full">
                          {r.delivery_boy_id ? (
                            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 p-3 rounded-lg border border-blue-100 dark:border-blue-800 flex flex-col gap-1">
                              <p className="text-[10px] font-black uppercase tracking-widest">🚚 Driver Assigned</p>
                              <p className="text-sm font-bold">{r.delivery_boy_id.name}</p>
                              <p className="text-[11px] font-semibold opacity-80">📱 {r.delivery_boy_id.mobile_no}</p>
                            </div>
                          ) : (
                            <button 
                                onClick={() => handleAssignDriver(r.id)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-xs uppercase shadow-md transition"
                            >Assign Delivery Boy</button>
                          )}
                       </div>
                    )}
                    {r.delivery_type === 'pickup' && r.status === 'approved' && r.delivery_status !== 'ready_for_pickup' && (
                       <button onClick={()=>handleOwnerApproval(r.id, 'ready_for_pickup')} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg shadow transition">Mark Ready</button>
                    )}
                    {r.delivery_type === 'pickup' && r.delivery_status === 'ready_for_pickup' && (
                       <button onClick={()=>handleOwnerApproval(r.id, 'picked_up')} className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 rounded-lg shadow transition">Mark Picked Up & Paid</button>
                    )}
                  </div>
                </div>
              );
            })}
         </div>
       )}
    </div>
  );
}
