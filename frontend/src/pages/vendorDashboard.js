import { useState, useEffect } from "react";
import API from "../services/api";
import toast from "react-hot-toast";
import EmptyState from "../components/EmptyState";
import { TableRowSkeleton } from "../components/Skeleton";

export default function VendorDashboard() {
  const [activeTab, setActiveTab] = useState("manage"); 
  const [equipmentList, setEquipmentList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rentalRequests, setRentalRequests] = useState([]);
  const [rentalHistory, setRentalHistory] = useState([]);
  const [returnVerifications, setReturnVerifications] = useState([]);
  const [updateRequests, setUpdateRequests] = useState([]);
  const [vendorOrders, setVendorOrders] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vendorStatus, setVendorStatus] = useState("pending");
  const [earnings, setEarnings] = useState(0);
  // Update request modal
  const [showReqModal, setShowReqModal] = useState(false);
  const [reqTarget, setReqTarget] = useState(null);
  const [reqType, setReqType] = useState("update");
  const [reqData, setReqData] = useState({ price: "", quantity: "", description: "" });

  // Form states for ADD / EDIT
  const [data, setData] = useState({
    name: "",
    price: "",
    category: "",
    quantity: 1,
    description: "",
    city: "Jaipur",
  });
  const [image, setImage] = useState(null);

  // Edit Mode state
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchCategories();
    fetchVendorStatus();
    fetchDeliveryBoys();
  }, []);

  const fetchVendorStatus = async () => {
    try {
      const res = await API.get("/vendor/me");
      setVendorStatus(res.data.vendor_status);
      const earnRes = await API.get("/vendor/earnings");
      setEarnings(earnRes.data.earnings || 0);
    } catch(err) { console.error("Error fetching status or earnings", err); }
  };

  useEffect(() => {
    if (activeTab === "manage")      fetchEquipment();
    if (activeTab === "add") {
       fetchCategories();
       // Auto-restore equipment data if NOT in edit mode
       if (!editId) {
         const saved = localStorage.getItem("vendor_add_equipment_data");
         if (saved) setData(JSON.parse(saved));
       }
    }
    if (activeTab === "requests")    fetchRentalRequests();
    if (activeTab === "history")     fetchRentalHistory();
    if (activeTab === "returns")     fetchReturnVerifications();
    if (activeTab === "update_reqs") fetchUpdateRequests();
    if (activeTab === "orders")      fetchVendorOrders();
  }, [activeTab, editId]);

  // Auto-save equipment data
  useEffect(() => {
    if (activeTab === "add" && !editId) {
      localStorage.setItem("vendor_add_equipment_data", JSON.stringify(data));
    }
  }, [data, activeTab, editId]);


  const fetchCategories = async () => {
    try {
      const res = await API.get("/categories");
      setCategories(res.data?.data || res.data || []);
    } catch(err) { console.error(err); }
  };

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const res = await API.get("/vendor/equipment");
      setEquipmentList(res.data?.data || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRentalRequests = async () => {
    setLoading(true);
    try {
       const res = await API.get("/vendor/rental-requests");
       setRentalRequests(res.data);
    } catch(err) { console.error(err); }
    setLoading(false);
  };

  const fetchRentalHistory = async () => {
    setLoading(true);
    try {
      const res = await API.get("/vendor/rentals");
      setRentalHistory(res.data?.data || res.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchReturnVerifications = async () => {
    setLoading(true);
    try {
      const res = await API.get("/vendor/returns");
      setReturnVerifications(res.data?.data || res.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchVendorOrders = async () => {
    setLoading(true);
    try {
      const res = await API.get("/vendor/orders");
      setVendorOrders(res.data?.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchUpdateRequests = async () => {
    setLoading(true);
    try {
      const res = await API.get("/vendor/update-requests");
      setUpdateRequests(res.data.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchDeliveryBoys = async () => {
    try {
      const res = await API.get("/vendor/delivery-boys");
      setDeliveryBoys(res.data.data || []);
    } catch (err) { console.error(err); }
  };

  const handleAssignDriver = async (orderId, driverId) => {
    try {
      await API.put(`/vendor/orders/${orderId}/assign-delivery`, { delivery_boy_id: driverId });
      toast.success("Driver assigned successfully");
      fetchVendorOrders();
      fetchRentalRequests();
    } catch (err) {
      toast.error(err.response?.data?.error || "Error assigning driver");
    }
  };



  const handleSubmitUpdateRequest = async () => {
    if (!reqTarget) return;
    const payload = {
      product_id: reqTarget.id,
      request_type: reqType,
      updated_data: reqType === 'update' ? {
        ...(reqData.price ? { price: Number(reqData.price) } : {}),
        ...(reqData.quantity ? { quantity: Number(reqData.quantity) } : {}),
        ...(reqData.description ? { description: reqData.description } : {}),
      } : null,
    };
    try {
      const res = await API.post("/vendor/update-requests", payload);
      toast.success(res.data.message);
      setShowReqModal(false);
      setReqTarget(null);
      setReqData({ price: "", quantity: "", description: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit request");
    }
  };

  const handleVerifyReturn = async (id, action) => {
    let penalty = 0;
    if (action === 'reject') {
      const input = window.prompt("Enter penalty amount (optional, enter 0 for none):");
      if (input === null) return;
      penalty = Number(input) || 0;
    } else {
      if (!window.confirm("Are you sure you want to approve this return? This will add the equipment back to your stock.")) return;
    }
    
    try {
      await API.put(`/returns/verify/${id}`, { action, penalty_amount: penalty });
      toast.success("Return verification submitted.");
      fetchReturnVerifications();
      fetchVendorStatus();
    } catch (err) {
      toast.error(err.response?.data?.error || "Error verifying return");
    }
  };


  const handleUpdateOrderStatus = async (id, status) => {
    if (!window.confirm(`Are you sure you want to mark this order as ${status.replace(/_/g, ' ')}?`)) return;
    try {
      const res = await API.put(`/vendor/orders/${id}/status`, { status });
      toast.success(res.data.message);
      fetchVendorOrders();
      fetchRentalRequests();
      fetchVendorStatus();
    } catch (err) {
      toast.error(err.response?.data?.error || "Error updating order status");
    }
  };

  const resetForm = () => {
    setData({ name: "", price: "", category: "", quantity: 1, description: "", city: "Jaipur" });
    setImage(null);
    setEditId(null);
  };

  const handleSubmit = async () => {
    if (vendorStatus !== 'approved') return toast.error("You must be an approved vendor to add equipment.");
    if (!data.name || !data.price || !data.category || !data.quantity)
      return toast.error("Important fields are missing");

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("price", data.price);
    formData.append("category", data.category);
    formData.append("quantity", data.quantity);
    formData.append("description", data.description);
    formData.append("city", data.city);
    if (image) {
      formData.append("image", image);
    }

    try {
      if (editId) {
        const res = await API.put(`/vendor/equipment/${editId}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success(res.data.message || "Equipment Updated successfully");
        setEditId(null);
        setActiveTab("manage"); 
      } else {
        const res = await API.post("/vendor/equipment", formData, { headers: { "Content-Type": "multipart/form-data" } });
        localStorage.removeItem("vendor_add_equipment_data");
        toast.success(res.data.message || "Equipment Added successfully");

        resetForm();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || "Task failed.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this equipment?")) return;
    try {
      await API.delete(`/vendor/equipment/${id}`);
      toast.success("Equipment deleted");
      fetchEquipment(); // refresh list
    } catch (err) {
      toast.error(err.response?.data?.error || "Error deleting equipment");
    }
  };

  const triggerEdit = (item) => {
    setEditId(item.id);
    setData({
      name: item.name,
      price: item.price,
      category: item.category,
      quantity: item.quantity,
      description: item.description || "",
      city: item.city || "Jaipur",
    });
    setImage(null);
    setActiveTab("add");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 md:p-12 transition-colors">
      <div className="max-w-6xl mx-auto mb-6 flex justify-end">
         <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
               💰
            </div>
            <div>
               <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase">Total Earnings</p>
               <h3 className="text-2xl font-bold text-gray-800 dark:text-white">₹{earnings}</h3>
            </div>
         </div>
      </div>

      <div className="max-w-6xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-sm border dark:border-gray-800 overflow-hidden">
        
        {/* TAB CONTROLS */}
        <div className="flex border-b dark:border-gray-800 bg-indigo-50 dark:bg-indigo-900/20 overflow-x-auto">
          <button 
             onClick={() => { setActiveTab("manage"); setEditId(null); resetForm(); }}
             className={`flex-1 py-4 font-semibold text-center transition whitespace-nowrap px-3 ${activeTab === "manage" ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 border-t-4 border-indigo-600" : "text-gray-500 dark:text-gray-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"}`}
          >
            📋 My Equipment
          </button>
          {vendorStatus === 'approved' && (
            <button 
               onClick={() => { setActiveTab("add"); if(!editId) resetForm(); }} 
               className={`flex-1 py-4 font-semibold text-center transition whitespace-nowrap px-3 ${activeTab === "add" ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 border-t-4 border-indigo-600" : "text-gray-500 dark:text-gray-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"}`}
            >
               {editId ? "✏️ Edit Equipment" : "➕ Add New"}
            </button>
          )}

          <button 
             onClick={() => { setActiveTab("requests"); setEditId(null); resetForm(); }}
             className={`flex-1 py-4 font-semibold text-center transition whitespace-nowrap px-3 ${activeTab === "requests" ? "bg-white text-indigo-600 border-t-4 border-indigo-600" : "text-gray-500 hover:bg-indigo-100"}`}
          >
            📦 Requests
          </button>
          <button 
             onClick={() => { setActiveTab("history"); setEditId(null); resetForm(); }}
             className={`flex-1 py-4 font-semibold text-center transition whitespace-nowrap px-3 ${activeTab === "history" ? "bg-white text-indigo-600 border-t-4 border-indigo-600" : "text-gray-500 hover:bg-indigo-100"}`}
          >
            📜 Rental History
          </button>
          <button 
             onClick={() => { setActiveTab("returns"); setEditId(null); resetForm(); }}
             className={`flex-1 py-4 font-semibold text-center transition whitespace-nowrap px-3 ${activeTab === "returns" ? "bg-white text-indigo-600 border-t-4 border-indigo-600" : "text-gray-500 hover:bg-indigo-100"}`}
          >
            🔄 Returns
          </button>
          <button 
             onClick={() => { setActiveTab("update_reqs"); setEditId(null); resetForm(); }}
             className={`flex-1 py-4 font-semibold text-center transition whitespace-nowrap px-3 ${activeTab === "update_reqs" ? "bg-white text-indigo-600 border-t-4 border-indigo-600" : "text-gray-500 hover:bg-indigo-100"}`}
          >
            📝 My Requests
          </button>
          <button 
             onClick={() => { setActiveTab("orders"); setEditId(null); resetForm(); }}
             className={`flex-1 py-4 font-semibold text-center transition whitespace-nowrap px-3 ${activeTab === "orders" ? "bg-white text-indigo-600 border-t-4 border-indigo-600" : "text-gray-500 hover:bg-indigo-100"}`}
          >
            🛒 All Orders
          </button>
        </div>

        {vendorStatus !== 'approved' && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-8 mt-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700 font-semibold">
                  {vendorStatus === 'rejected' 
                    ? "Your vendor application has been rejected by an administrator." 
                    : "Your vendor account is pending approval. You can add equipment after an administrator approves your profile."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="p-8">
          {/* TAB 1: MANAGE INVENTORY */}
          {activeTab === "manage" && (
            <div>
               <h2 className="text-3xl font-bold mb-6 text-gray-800">My Hosted Equipment</h2>
               {loading ? (
                 <div className="overflow-x-auto"><table className="w-full text-left text-sm"><tbody className="divide-y"><TableRowSkeleton columns={5}/><TableRowSkeleton columns={5}/><TableRowSkeleton columns={5}/></tbody></table></div>
               ) : equipmentList.length === 0 ? (
                 <EmptyState icon="📦" title="No equipment listed" message="You haven't listed any equipment yet. Add some to start earning!" actionLabel="Add Equipment" actionLink="#" />
               ) : (
                 <div className="overflow-x-auto">
                    <table className="w-full border-collapse bg-white text-left text-sm text-gray-500">
                       <thead className="bg-gray-50">
                         <tr>
                           <th scope="col" className="px-6 py-4 font-bold text-gray-900">Equipment</th>
                           <th scope="col" className="px-6 py-4 font-bold text-gray-900">Price / Day</th>
                           <th scope="col" className="px-6 py-4 font-bold text-gray-900">Stock Qty</th>
                           <th scope="col" className="px-6 py-4 font-bold text-gray-900">Status</th>
                           <th scope="col" className="px-6 py-4 font-bold text-gray-900">Actions</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100 border-t border-gray-100">
                         {equipmentList.map(item => (
                           <tr key={item.id} className="hover:bg-gray-50">
                             <td className="px-6 py-4">
                               <div className="flex gap-4 items-center">
                                  <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                                     {item.image ? <img src={(item.image && item.image.startsWith("http") ? item.image : `http://localhost:5000${item.image}`)} alt={item.name} className="h-full w-full object-contain" /> : "📷"}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900">{item.name}</div>
                                    <div className="text-xs text-gray-400 capitalize">{item.category}</div>
                                  </div>
                               </div>
                             </td>
                             <td className="px-6 py-4 font-medium text-gray-700">₹{item.price}</td>
                             <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${item.quantity > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                  {item.quantity} listed
                                </span>
                             </td>
                             <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${item.status==='approved'?'bg-green-100 text-green-700':item.status==='rejected'?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-700'}`}>
                                  {item.status}
                                </span>
                             </td>
                              <td className="px-6 py-4">
                                <div className="flex gap-2 flex-wrap">
                                  <button onClick={() => triggerEdit(item)} className="text-blue-600 hover:text-blue-800 font-semibold underline text-sm">Edit</button>
                                  <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 font-semibold underline text-sm">Delete</button>
                                  <button
                                    onClick={() => { setReqTarget(item); setReqType('update'); setReqData({ price: '', quantity: '', description: '' }); setShowReqModal(true); }}
                                    className="text-indigo-500 hover:text-indigo-700 font-semibold underline text-sm"
                                  >Request Change</button>
                                </div>
                              </td>
                           </tr>
                         ))}
                       </tbody>
                    </table>
                 </div>
               )}
            </div>
          )}

          {/* TAB 2: ADD / EDIT FORM */}
          {activeTab === "add" && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold mb-6 text-gray-800">
                {editId ? "Update Equipment Details" : "List New Equipment"}
              </h2>

              <div className="space-y-5">
                 <p className="text-sm border-l-4 border-yellow-400 pl-3 py-1 bg-yellow-50 text-yellow-800 rounded">
                    <strong>Note:</strong> All new or updated equipment must be reviewed by an admin before going live on the platform.
                 </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Name</label>
                  <input
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. Sony A7III Camera"
                    value={data.name}
                    onChange={e => setData({ ...data, name: e.target.value })}
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Price per day (₹)</label>
                    <input
                      type="number" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      placeholder="0" value={data.price}
                      onChange={e => setData({ ...data, price: e.target.value })}
                    />
                    {data.price > 0 && (
                      <p className="text-xs text-indigo-600 mt-2 font-semibold">
                         List Price: ₹{Math.round((Number(data.price)||0) * 1.10)} (+10% Admin Fee)
                      </p>
                    )}
                  </div>
                  <div className="flex-1">
                     <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                     <input
                       type="number" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                       placeholder="1" min="0" value={data.quantity}
                       onChange={e => setData({ ...data, quantity: e.target.value })}
                     />
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white capitalize"
                      value={data.category}
                      onChange={e => setData({ ...data, category: e.target.value })}
                    >
                      <option value="">Select Category</option>
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">City Location</label>
                    <select
                      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                      value={data.city}
                      onChange={e => setData({ ...data, city: e.target.value })}
                    >
                      <option value="Jaipur">Jaipur</option>
                      <option value="Ajmer">Ajmer</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white h-32 resize-none"
                    placeholder="Detailed product behavior, inclusions, limitations..."
                    value={data.description}
                    onChange={e => setData({ ...data, description: e.target.value })}
                  />
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">
                     {editId ? "Update Product Image (Optional)" : "Product Image"}
                   </label>
                   <input
                      type="file" accept="image/*"
                      onChange={e => setImage(e.target.files[0])}
                      className="w-full p-2 border rounded-lg text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                </div>

                <div className="flex gap-4 pt-4">
                  {editId && (
                     <button onClick={() => { setActiveTab("manage"); resetForm(); }} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 rounded-lg transition duration-200">
                       Cancel Edit
                     </button>
                  )}
                  <button onClick={handleSubmit} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition duration-200">
                    {editId ? "Save & Request Approval" : "Submit Equipment"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: RENTAL REQUESTS */}
          {activeTab === "requests" && (
            <div>
               <h2 className="text-3xl font-bold mb-6 text-gray-800">Pending Orders</h2>
               {loading ? <p className="text-gray-500">Loading requests...</p> : rentalRequests.length === 0 ? (
                 <EmptyState icon="🔔" title="No pending requests" message="You have no pending rental requests at this time." />
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rentalRequests.map(r => (
                      <div key={r.id} className="border dark:border-gray-800 p-4 rounded-xl bg-white dark:bg-gray-800/50 shadow-sm flex flex-col items-center text-center transition-colors">
                        {r.image ? (
                          <img src={(r.image.startsWith("http") ? r.image : `http://localhost:5000${r.image}`)} alt={r.equipment_name} className="h-24 w-24 object-contain mb-3 rounded-lg bg-gray-50 dark:bg-gray-700 p-1" />
                        ) : (
                          <div className="h-24 w-24 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-3 text-2xl">📦</div>
                        )}
                        
                        <h3 className="font-bold text-lg mb-1 dark:text-white line-clamp-1" title={r.equipment_name}>{r.equipment_name || "Unknown Item"}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-widest font-semibold">{r.delivery_city || "Anywhere"}</p>
                        
                        <div className="flex items-center gap-2 mb-2 justify-center">
                          <span className="text-xs font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Qty: {r.quantity}</span>
                          <span className="text-xs font-black bg-green-100 text-green-700 px-2 py-0.5 rounded">₹{r.total_price}</span>
                        </div>

                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">{new Date(r.start_date).toLocaleDateString()} to {new Date(r.end_date).toLocaleDateString()}</p>
                        
                        <div className="w-full bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg mb-3 shadow-inner text-xs text-gray-700 dark:text-gray-300 border dark:border-gray-800">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-gray-400 uppercase text-[9px]">Customer:</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-200">{r.user_name || "Unknown"}</span>
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
                              <button onClick={()=>handleUpdateOrderStatus(r.id, 'approved')} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg shadow transition">Approve</button>
                              <button onClick={()=>handleUpdateOrderStatus(r.id, 'rejected')} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg shadow transition">Reject</button>
                            </div>
                          )}
                          {r.delivery_type === 'pickup' && r.status === 'approved' && r.delivery_status !== 'ready_for_pickup' && (
                             <button onClick={()=>handleUpdateOrderStatus(r.id, 'ready_for_pickup')} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg shadow transition">Mark Ready</button>
                          )}
                          {r.delivery_type === 'pickup' && r.delivery_status === 'ready_for_pickup' && (
                             <button onClick={()=>handleUpdateOrderStatus(r.id, 'picked_up')} className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 rounded-lg shadow transition">Mark Picked Up & Paid</button>
                          )}
                        </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          )}

          {/* TAB: RENTAL HISTORY */}
          {activeTab === "history" && (
            <div>
              <h2 className="text-3xl font-bold mb-6 text-gray-800">Rental Record History</h2>
              {loading ? (
                 <div className="overflow-x-auto"><table className="w-full text-left text-sm"><tbody className="divide-y"><TableRowSkeleton columns={5}/><TableRowSkeleton columns={5}/><TableRowSkeleton columns={5}/></tbody></table></div>
              ) : rentalHistory.length === 0 ? (
                <EmptyState icon="📜" title="No rental history" message="No past rental records found." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse bg-white text-left text-sm text-gray-500">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-4 font-bold text-gray-900">Equipment</th>
                        <th scope="col" className="px-6 py-4 font-bold text-gray-900">Customer</th>
                        <th scope="col" className="px-6 py-4 font-bold text-gray-900">Rental Dates</th>
                        <th scope="col" className="px-6 py-4 font-bold text-gray-900">Status</th>
                        <th scope="col" className="px-6 py-4 font-bold text-gray-900">Total Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 border-t border-gray-100">
                      {rentalHistory.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex gap-4 items-center">
                              <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                                {r.image ? <img src={(r.image && r.image.startsWith("http") ? r.image : `http://localhost:5000${r.image}`)} alt={r.equipment_name} className="h-full w-full object-contain" /> : "📷"}
                              </div>
                              <div className="font-semibold text-gray-900">{r.equipment_name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                             <div>
                               <div className="text-gray-900">{r.user_name}</div>
                               <div className="text-xs text-gray-400">{r.user_email}</div>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-xs">
                             {new Date(r.start_date).toLocaleDateString()} - {new Date(r.end_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                              r.status === 'active' ? 'bg-blue-100 text-blue-700' :
                              r.status === 'returned' ? 'bg-green-100 text-green-700' :
                              r.status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {r.status}
                            </span>
                            <div className="text-[10px] text-gray-400 mt-1">Delivery: {r.delivery_status}</div>
                            {r.delivery_type === 'pickup' && r.delivery_status === 'ready_for_pickup' && (
                               <div className="mt-2">
                                  <button onClick={() => handleUpdateOrderStatus(r.id, 'picked_up')} className="text-xs bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-1 px-2 rounded">
                                    Mark Picked Up & Paid
                                  </button>
                               </div>
                            )}
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-900">₹{r.total_price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: RETURNS VERIFICATION */}
          {activeTab === "returns" && (
            <div>
              <h2 className="text-3xl font-bold mb-6 text-gray-800">Verify Returns</h2>
              {loading ? (
                 <div className="overflow-x-auto"><table className="w-full text-left text-sm"><tbody className="divide-y"><TableRowSkeleton columns={4}/><TableRowSkeleton columns={4}/></tbody></table></div>
              ) : returnVerifications.length === 0 ? (
                <EmptyState icon="🔄" title="No pending returns" message="No returns are pending your verification right now." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse bg-white text-left text-sm text-gray-500">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-4 font-bold text-gray-900">Equipment</th>
                        <th scope="col" className="px-6 py-4 font-bold text-gray-900">Customer</th>
                        <th scope="col" className="px-6 py-4 font-bold text-gray-900">Status</th>
                        <th scope="col" className="px-6 py-4 font-bold text-gray-900">Verify</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 border-t border-gray-100">
                      {returnVerifications.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex gap-4 items-center">
                              <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                                {r.image ? <img src={(r.image && r.image.startsWith("http") ? r.image : `http://localhost:5000${r.image}`)} alt={r.equipment_name} className="h-full w-full object-contain" /> : "📷"}
                              </div>
                              <div className="font-semibold text-gray-900">{r.equipment_name} (Qty: {r.quantity})</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                             <div>
                               <div className="text-gray-900">{r.user_name}</div>
                               <div className="text-xs text-gray-400">Order #{r.id}</div>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-700">
                              {r.status.replace(/_/g, ' ')}
                            </span>
                            <div className="text-[10px] text-gray-400 mt-1 uppercase">Method: {r.return_method?.replace('_', ' ')}</div>
                          </td>
                          <td className="px-6 py-4 flex gap-2 flex-col md:flex-row">
                            <button onClick={() => handleVerifyReturn(r.id, 'approve')} className="text-white bg-green-500 px-3 py-2 rounded shadow hover:bg-green-600 text-xs font-bold whitespace-nowrap">Approve Return</button>
                            <button onClick={() => handleVerifyReturn(r.id, 'reject')} className="text-white bg-red-500 px-3 py-2 rounded shadow hover:bg-red-600 text-xs font-bold whitespace-nowrap">Report Issue</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: MY UPDATE REQUESTS */}
          {activeTab === "update_reqs" && (
            <div>
              <h2 className="text-3xl font-bold mb-6 text-gray-800">My Change Requests</h2>
              {loading ? (
                 <div className="overflow-x-auto"><table className="w-full text-left text-sm"><tbody className="divide-y"><TableRowSkeleton columns={5}/></tbody></table></div>
              ) : updateRequests.length === 0 ? (
                <EmptyState icon="📝" title="No change requests" message="No requests submitted yet. Use the 'Request Change' button on any product." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse bg-white text-left text-sm text-gray-500">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-4 font-bold text-gray-900">Product</th>
                        <th scope="col" className="px-6 py-4 font-bold text-gray-900">Type</th>
                        <th scope="col" className="px-6 py-4 font-bold text-gray-900">Proposed Changes</th>
                        <th scope="col" className="px-6 py-4 font-bold text-gray-900">Status</th>
                        <th scope="col" className="px-6 py-4 font-bold text-gray-900">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 border-t border-gray-100">
                      {updateRequests.map(r => {
                        const upd = r.updated_data ? (typeof r.updated_data === 'string' ? JSON.parse(r.updated_data) : r.updated_data) : {};
                        return (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-semibold text-gray-900">{r.product_name}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${ r.request_type === 'delete' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700' }`}>
                                {r.request_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-600">
                              {r.request_type === 'delete' ? <span className="text-red-500 font-semibold">Delete product</span> : (
                                <ul className="space-y-0.5">
                                  {upd.price && <li>💰 Price → ₹{upd.price}</li>}
                                  {upd.quantity && <li>📦 Quantity → {upd.quantity}</li>}
                                  {upd.description && <li>📝 Description updated</li>}
                                </ul>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                r.status === 'approved' ? 'bg-green-100 text-green-700' :
                                r.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>{r.status}</span>
                            </td>
                            <td className="px-6 py-4 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: ALL ORDERS (role-based vendor view) */}
          {activeTab === "orders" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-gray-800">🛒 All Orders</h2>
                <span className="text-sm text-gray-400 bg-gray-100 px-3 py-1 rounded-full font-semibold">{vendorOrders.length} total</span>
              </div>
              {loading ? (
                 <div className="overflow-x-auto"><table className="w-full text-left text-sm"><tbody className="divide-y"><TableRowSkeleton columns={7}/><TableRowSkeleton columns={7}/></tbody></table></div>
              ) : vendorOrders.length === 0 ? (
                <EmptyState icon="📭" title="No orders yet" message="No orders yet for your products." />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                  <table className="w-full text-sm text-left text-gray-600 bg-white">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b">
                      <tr>
                        <th scope="col" className="px-4 py-3">Product</th>
                        <th scope="col" className="px-4 py-3">Customer</th>
                        <th scope="col" className="px-4 py-3">Dates</th>
                        <th scope="col" className="px-4 py-3">Amount</th>
                        <th scope="col" className="px-4 py-3">Payment</th>
                        <th scope="col" className="px-4 py-3">Status</th>
                        <th scope="col" className="px-4 py-3">Driver</th>
                        <th scope="col" className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {vendorOrders.map(o => (
                        <tr key={o.order_id} className="hover:bg-indigo-50/40 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {o.product_image
                                  ? <img src={(o.product_image && o.product_image.startsWith("http") ? o.product_image : `http://localhost:5000${o.product_image}`)} alt="" className="w-full h-full object-contain" />
                                  : <span className="text-lg">📦</span>}
                              </div>
                              <span className="font-semibold text-gray-800 text-xs leading-tight">{o.product_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-800">{o.user_name}</div>
                            <div className="text-[10px] text-indigo-500 font-bold">Order #{o.order_id}</div>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <div>{new Date(o.start_date).toLocaleDateString()}</div>
                            <div className="text-gray-400">→ {new Date(o.end_date).toLocaleDateString()}</div>
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-800">₹{o.total_price?.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${o.payment_method === 'ONLINE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                              {o.payment_method}
                            </span>
                            <div className={`mt-1 text-[10px] font-bold uppercase ${o.payment_status === 'paid' ? 'text-green-600' : o.payment_status === 'failed' ? 'text-red-500' : 'text-yellow-600'}`}>
                              {o.payment_status}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              o.status === 'active' ? 'bg-blue-100 text-blue-700' :
                              o.status === 'returned' ? 'bg-green-100 text-green-700' :
                              o.status === 'cancelled' ? 'bg-red-100 text-red-500' :
                              'bg-yellow-100 text-yellow-700'}`}>
                              {o.status}
                            </span>
                            <div className="text-[10px] text-gray-400 mt-0.5 uppercase">{o.delivery_status}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            {o.driver_name ? (
                              <div>
                                <div className="font-bold text-gray-800">{o.driver_name}</div>
                                <div className="text-[10px] text-gray-400">📱 {o.driver_phone}</div>
                              </div>
                            ) : (
                              <span className="text-gray-300 italic">None</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-col gap-1 items-end">
                              {o.status === "approved" && o.delivery_type === 'delivery' && (
                                <div className="flex flex-col gap-1">
                                  {o.driver_name ? (
                                    <span className="text-[10px] text-blue-600 font-bold uppercase">✅ Assigned</span>
                                  ) : (
                                    <button 
                                      onClick={() => handleAssignDriver(o.order_id)}
                                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm transition"
                                    >Assign Delivery Boy</button>
                                  )}
                                </div>
                              )}
                              {o.status === "pending" && (
                                <button onClick={() => handleUpdateOrderStatus(o.order_id, 'approved')} className="bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded">Approve</button>
                              )}
                              {o.delivery_type === 'pickup' && o.status === 'approved' && o.delivery_status !== 'ready_for_pickup' && o.delivery_status !== 'delivered' && (
                                <button onClick={() => handleUpdateOrderStatus(o.order_id, 'ready_for_pickup')} className="bg-blue-500 hover:bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded">Mark Ready</button>
                              )}
                              {o.delivery_type === 'pickup' && o.delivery_status === 'ready_for_pickup' && (
                                <button onClick={() => handleUpdateOrderStatus(o.order_id, 'picked_up')} className="bg-yellow-500 hover:bg-yellow-600 text-black text-[10px] font-bold px-2 py-1 rounded">Picked Up</button>
                              )}
                              {o.status === "pending" && (
                                <button onClick={() => handleUpdateOrderStatus(o.order_id, 'rejected')} className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded">Reject</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* ── REQUEST CHANGE MODAL ── */}
    {showReqModal && reqTarget && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-1">Request Change</h3>
          <p className="text-sm text-gray-500 mb-6">Product: <span className="font-semibold text-gray-800">{reqTarget.name}</span></p>

          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setReqType('update')}
              className={`flex-1 py-2 rounded-lg font-semibold text-sm border transition ${ reqType === 'update' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400' }`}
            >✏️ Update Fields</button>
            <button
              onClick={() => setReqType('delete')}
              className={`flex-1 py-2 rounded-lg font-semibold text-sm border transition ${ reqType === 'delete' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-300 hover:border-red-400' }`}
            >🗑️ Request Delete</button>
          </div>

          {reqType === 'update' && (
            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">New Price (₹) — leave blank to keep current</label>
                <input type="number" className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                  placeholder={`Current: ₹${reqTarget.price}`} value={reqData.price}
                  onChange={e => setReqData({ ...reqData, price: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">New Quantity — leave blank to keep current</label>
                <input type="number" className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                  placeholder={`Current: ${reqTarget.quantity}`} value={reqData.quantity}
                  onChange={e => setReqData({ ...reqData, quantity: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">New Description — leave blank to keep current</label>
                <textarea rows={3} className="w-full p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none resize-none"
                  placeholder="Updated description..."
                  value={reqData.description}
                  onChange={e => setReqData({ ...reqData, description: e.target.value })} />
              </div>
            </div>
          )}

          {reqType === 'delete' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 font-semibold">⚠️ This will request permanent deletion of <span className="underline">{reqTarget.name}</span>.</p>
              <p className="text-xs text-red-500 mt-1">An admin must approve this before the product is removed.</p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => { setShowReqModal(false); setReqTarget(null); }}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg transition text-sm">
              Cancel
            </button>
            <button onClick={handleSubmitUpdateRequest}
              className={`flex-1 font-bold py-2.5 rounded-lg transition text-sm text-white ${ reqType === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700' }`}>
              Submit Request
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
