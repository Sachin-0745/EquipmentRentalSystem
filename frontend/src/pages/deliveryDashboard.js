import { useState, useEffect } from "react";
import API from "../services/api";
import toast from "react-hot-toast";
import EmptyState from "../components/EmptyState";
import { CardSkeleton, TableRowSkeleton } from "../components/Skeleton";

export default function DeliveryDashboard() {
  const [orders, setOrders] = useState([]);
  const [history, setHistory] = useState([]);
  const [returnPickups, setReturnPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [earnings, setEarnings] = useState(0);
  const [revealedContacts, setRevealedContacts] = useState({}); // rentalId -> phone

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      const res = await API.get("/delivery/earnings");
      setEarnings(res.data.earnings || 0);
    } catch(err) { console.error("Error fetching earnings", err); }
  };

  useEffect(() => {
    if (activeTab === "active") fetchOrders();
    else if (activeTab === "history") fetchHistory();
    else if (activeTab === "returns") fetchReturns();
  }, [activeTab]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await API.get("/delivery/orders");
      setOrders(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await API.get("/delivery/history");
      setHistory(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res = await API.get("/delivery/returns");
      setReturnPickups(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleReject = async (id) => {
    if (!window.confirm("Are you sure you want to reject this delivery?")) return;
    try {
       await API.put(`/delivery/orders/${id}/action`, { action: 'reject' });
       toast.success("Order rejected and passed to another driver.");
       fetchOrders();
    } catch(e) { toast.error(e.response?.data?.error || "Error"); }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
       await API.put(`/delivery/orders/${id}/action`, { action: 'status', status });
       toast.success(`Status updated to ${status}`);
       fetchOrders();
    } catch(e) { toast.error(e.response?.data?.error || "Error"); }
  };

  const handleReturnAction = async (id, action) => {
    try {
      await API.put(`/delivery/returns/${id}/action`, { action });
      toast.success(`Return ${action}ed successfully`);
      fetchReturns();
    } catch (err) { toast.error(err.response?.data?.error || "Error"); }
  };

  const handleReturnPicked = async (id) => {
    try {
      await API.put(`/delivery/returns/${id}/picked`);
      toast.success("Marked as picked up!");
      fetchReturns();
    } catch (err) { toast.error(err.response?.data?.error || "Error"); }
  };

  const fetchCustomerContact = async (rentalId) => {
    if (revealedContacts[rentalId]) return; // already fetched
    try {
      const res = await API.get(`/rentals/${rentalId}/contact`);
      const phone = res.data?.data?.user?.phone || "Not available";
      setRevealedContacts(prev => ({ ...prev, [rentalId]: phone }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not fetch contact");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 p-6 md:p-12 transition-colors">
       <div className="max-w-5xl mx-auto mb-6 flex justify-end">
          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 flex items-center gap-4 transition-colors">
             <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                💸
             </div>
             <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Total Earnings</p>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">₹{earnings}</h3>
             </div>
          </div>
       </div>

       <div className="max-w-5xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-sm border dark:border-gray-800 overflow-hidden transition-colors">
          
          <div className="flex border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
             <button 
                onClick={() => setActiveTab("active")}
                className={`flex-1 py-4 font-bold text-center transition ${activeTab === "active" ? "bg-white dark:bg-gray-900 text-blue-600 border-t-4 border-blue-600" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
             >
                🚚 Active Deliveries ({orders.length})
             </button>
             <button 
                onClick={() => setActiveTab("history")}
                className={`flex-1 py-4 font-bold text-center transition ${activeTab === "history" ? "bg-white dark:bg-gray-900 text-blue-600 border-t-4 border-blue-600" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
             >
                📜 Delivery History
             </button>
             <button 
                onClick={() => setActiveTab("returns")}
                className={`flex-1 py-4 font-bold text-center transition ${activeTab === "returns" ? "bg-white dark:bg-gray-900 text-blue-600 border-t-4 border-blue-600" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
             >
                🔄 Return Pickups
             </button>
          </div>

          <div className="p-8">
            {activeTab === "active" ? (
              <div>
                <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white border-b dark:border-gray-800 pb-4 mb-6">Current Assignments</h1>
                {loading ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><CardSkeleton /><CardSkeleton /></div>
                ) : orders.length === 0 ? (
                   <EmptyState icon="☕" title="You're all caught up!" message="No active deliveries assigned to you at the moment." />
                ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {orders.map(o => (
                         <div key={o.id} className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-5 bg-white dark:bg-gray-800 relative hover:border-blue-400 dark:hover:border-blue-500 transition text-left">
                            {o.delivery_status === 'assigned' && <div className="absolute top-0 right-0 bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg shadow-sm uppercase tracking-widest">Incoming</div>}

                            <div className="flex gap-4 mb-4">
                               {o.image ? <img src={(o.image && o.image.startsWith("http") ? o.image : `http://localhost:5000${o.image}`)} className="w-16 h-16 object-cover rounded-lg bg-gray-50 dark:bg-gray-700 border dark:border-gray-600" alt="Item" /> : <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-2xl border dark:border-gray-600">📦</div>}
                               <div>
                                  <h3 className="font-bold text-lg text-gray-800 dark:text-white line-clamp-1">{o.equipment_name}</h3>
                                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500">Order ID: #{o.id}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                     <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Qty: {o.quantity}</p>
                                     <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${o.due_status === 'today' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'}`}>
                                       {o.due_status === 'today' ? '📅 Due Today' : `⏳ Starts ${new Date(o.start_date).toLocaleDateString()}`}
                                     </span>
                                  </div>
                               </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 mb-4 text-sm border dark:border-gray-700">
                                <p className="mb-2"><span className="text-gray-400 dark:text-gray-500 block text-[10px] font-bold uppercase tracking-tight">Customer</span> <span className="font-bold text-gray-700 dark:text-gray-300">{o.user_name}</span></p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-tight">Phone:</span>
                                  {revealedContacts[o.id] ? (
                                    <a href={`tel:${revealedContacts[o.id]}`} className="font-bold text-blue-600 dark:text-blue-400 hover:underline text-sm">📱 {revealedContacts[o.id]}</a>
                                  ) : (
                                    <button
                                      onClick={() => fetchCustomerContact(o.id)}
                                      className="text-xs bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-400 font-bold px-2 py-1 rounded transition"
                                    >🔒 Reveal Contact</button>
                                  )}
                                  {o.payment_method === 'COD' && (
                                   <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-black px-2 py-1 rounded border border-amber-200 dark:border-amber-800 animate-pulse">
                                     💵 COLLECT ₹{o.total_price}
                                   </span>
                                 )}
                                </div>
                                <p className="mt-2 flex justify-between items-end">
                                  <span>
                                    <span className="text-gray-400 dark:text-gray-500 block text-[10px] font-bold uppercase tracking-tight">Dropoff Address ({o.delivery_city})</span> 
                                    <span className="font-bold text-gray-700 dark:text-gray-300">{o.delivery_address}</span>
                                  </span>
                                  {o.lat && o.lng && (
                                    <a 
                                      href={`https://www.google.com/maps?q=${o.lat},${o.lng}`} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="text-[10px] font-black text-blue-500 hover:underline flex items-center gap-1 uppercase"
                                    >
                                      📍 Map
                                    </a>
                                  )}
                                </p>
                             </div>

                            {o.delivery_status === 'assigned' ? (
                               <div className="flex gap-3 mt-4">
                                  <button onClick={()=>handleStatusUpdate(o.id, 'picked_up')} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded shadow-md transition">Accept & Pick Up</button>
                                  <button onClick={()=>handleReject(o.id)} className="flex-1 border-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold py-2 rounded transition">Skip</button>
                                </div>
                            ) : (
                               <div className="flex flex-col gap-2 mt-4">
                                  <div className="flex items-center gap-2 mb-2">
                                     <span className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-wider w-16 uppercase">STATUS:</span>
                                     <span className="flex-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400 text-xs font-black uppercase rounded text-center">{o.delivery_status.replace(/_/g, ' ')}</span>
                                  </div>
                                  
                                  {o.delivery_status === 'picked_up' && (
                                     <button onClick={()=>handleStatusUpdate(o.id, 'out_for_delivery')} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-2 rounded shadow-md transition uppercase text-sm">Out for Delivery 🚚</button>
                                  )}
                                  
                                  {o.delivery_status === 'out_for_delivery' && (
                                     <button onClick={()=>handleStatusUpdate(o.id, 'delivered')} className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-2 rounded shadow-md transition uppercase text-sm">Confirm Delivery ✅</button>
                                  )}
                               </div>
                            )}
                         </div>
                      ))}
                   </div>
                )}
              </div>
            ) : activeTab === "history" ? (
              <div>
                <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white border-b dark:border-gray-800 pb-4 mb-6">Completed Deliveries</h1>
                {loading ? (
                  <div className="overflow-x-auto"><table className="w-full text-left text-sm"><tbody className="divide-y"><TableRowSkeleton columns={4}/><TableRowSkeleton columns={4}/></tbody></table></div>
                ) : history.length === 0 ? (
                  <EmptyState icon="📜" title="No deliveries yet" message="No completed deliveries found in your record." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse bg-white dark:bg-gray-900 text-left text-sm text-gray-500 dark:text-gray-400 transition-colors">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-6 py-4 font-bold text-gray-900 dark:text-white">ID</th>
                          <th className="px-6 py-4 font-bold text-gray-900 dark:text-white">Equipment</th>
                          <th className="px-6 py-4 font-bold text-gray-900 dark:text-white">Customer</th>
                          <th className="px-6 py-4 font-bold text-gray-900 dark:text-white">Type</th>
                          <th className="px-6 py-4 font-bold text-gray-900 dark:text-white">Address</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800 border-t border-gray-100 dark:border-gray-800">
                        {history.map(h => (
                          <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">#{h.id}</td>
                            <td className="px-6 py-4 flex items-center gap-3">
                               <div className="h-8 w-8 bg-gray-100 dark:bg-gray-800 rounded flex-shrink-0">
                                 {h.image ? <img src={(h.image && h.image.startsWith("http") ? h.image : `http://localhost:5000${h.image}`)} alt="Img" className="h-full w-full object-contain" /> : <span className="m-auto block text-center">📦</span>}
                               </div>
                               <span className="font-semibold text-gray-800 dark:text-gray-200">{h.equipment_name}</span>
                            </td>
                            <td className="px-6 py-4 dark:text-gray-300">{h.user_name}</td>
                            <td className="px-6 py-4">
                               <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${h.type === 'Return Pickup' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'}`}>
                                 {h.type}
                               </span>
                             </td>
                            <td className="px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400 truncate max-w-xs">{h.delivery_address}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white border-b dark:border-gray-800 pb-4 mb-6">Return Pickups</h1>
                {loading ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><CardSkeleton /><CardSkeleton /></div>
                ) : returnPickups.length === 0 ? (
                   <EmptyState icon="🔄" title="No return requests" message="No return pickups currently available." />
                ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {returnPickups.map(r => (
                         <div key={r.id} className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-5 bg-white dark:bg-gray-800 relative hover:border-blue-400 dark:hover:border-blue-500 transition text-left">
                            <div className="flex gap-4 mb-4">
                               {r.image ? <img src={(r.image && r.image.startsWith("http") ? r.image : `http://localhost:5000${r.image}`)} className="w-16 h-16 object-cover rounded-lg bg-gray-50 dark:bg-gray-700 border dark:border-gray-600" alt="Item" /> : <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-2xl border dark:border-gray-600">🔄</div>}
                               <div>
                                  <h3 className="font-bold text-lg text-gray-800 dark:text-white line-clamp-1">{r.equipment_name}</h3>
                                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500">Order ID: #{r.id}</p>
                                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Qty: {r.quantity}</p>
                               </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 mb-4 text-sm border dark:border-gray-700">
                               <p className="mb-2"><span className="text-gray-400 dark:text-gray-500 block text-[10px] font-bold uppercase tracking-tight">Customer Name & Phone</span> <span className="font-bold text-gray-700 dark:text-gray-300">{r.user_name} | {r.mobile_no}</span></p>
                               <p className="flex justify-between items-end">
                                 <span>
                                   <span className="text-gray-400 dark:text-gray-500 block text-[10px] font-bold uppercase tracking-tight">Pickup Address ({r.delivery_city})</span> 
                                   <span className="font-bold text-gray-700 dark:text-gray-300">{r.delivery_address}</span>
                                 </span>
                                 {r.lat && r.lng && (
                                   <a 
                                     href={`https://www.google.com/maps?q=${r.lat},${r.lng}`} 
                                     target="_blank" 
                                     rel="noreferrer"
                                     className="text-[10px] font-black text-blue-500 hover:underline flex items-center gap-1 uppercase"
                                   >
                                     📍 View Map
                                   </a>
                                 )}
                               </p>
                            </div>

                            {r.status === 'pickup_requested' ? (
                               <div className="flex gap-3 mt-4">
                                  <button onClick={() => handleReturnAction(r.id, 'accept')} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded shadow-md transition">Accept Pickup</button>
                                  <button onClick={() => handleReturnAction(r.id, 'reject')} className="flex-1 border-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold py-2 rounded transition">Reject</button>
                               </div>
                            ) : (
                               <div className="flex flex-col gap-2 mt-4">
                                  <div className="flex items-center gap-2 mb-2">
                                     <span className="text-xs font-bold text-gray-400 dark:text-gray-500 tracking-wider w-16 uppercase">STATUS:</span>
                                     <span className="flex-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400 text-xs font-black uppercase rounded text-center">{r.status.replace(/_/g, ' ')}</span>
                                  </div>
                                  {r.status === 'return_requested' ? (
                                    <div className="flex gap-2">
                                      <button onClick={() => handleReturnPicked(r.id)} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-2 rounded shadow-md transition uppercase text-sm">Mark as Picked Up</button>
                                      <button onClick={() => handleReturnAction(r.id, 'reject')} className="px-4 border-2 border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold py-2 rounded transition text-xs uppercase">Skip</button>
                                    </div>
                                  ) : r.status === 'returned' && (
                                    <div className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-[10px] font-black p-2 rounded text-center uppercase border border-green-200 dark:border-green-800">
                                      ✅ Item Picked Up - In Transit to Store
                                    </div>
                                  )}
                               </div>
                            )}
                         </div>
                      ))}
                   </div>
                )}
              </div>
            )}
          </div>
       </div>
    </div>
  );
}
