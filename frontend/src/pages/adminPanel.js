import { useState, useEffect } from "react";
import API from "../services/api";
import toast from "react-hot-toast";
import { handleError } from "../utils/errorHandler";
import { useFetch } from "../hooks/useFetch";
import { ConfirmModal, PromptModal } from "../components/Common/Modals";

// Extracted Components
import EquipmentForm from "../components/Admin/EquipmentForm";
import InventoryManager from "../components/Admin/InventoryManager";
import CategoryManager from "../components/Admin/CategoryManager";
import GlobalRentals from "../components/Admin/GlobalRentals";
import UserManager from "../components/Admin/UserManager";
import VendorVerifier from "../components/Admin/VendorVerifier";
import DeliveryVerifier from "../components/Admin/DeliveryVerifier";
import EquipmentApprover from "../components/Admin/EquipmentApprover";
import OrderManager from "../components/Admin/OrderManager";
import ReturnVerifier from "../components/Admin/ReturnVerifier";
import UpdateRequestManager from "../components/Admin/UpdateRequestManager";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("add"); 
  const [newCat, setNewCat] = useState("");
  
  // Modal State
  const [modal, setModal] = useState({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: null });
  const [prompt, setPrompt] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // Standardized Data Fetching Hooks
  const { data: categories, fetchData: fetchCategories } = useFetch("/categories");
  const { data: equipmentList, loading: equipLoading, pagination: equipPag, fetchData: fetchEquipment } = useFetch("/equipment");
  const { data: rentalsList, loading: rentalsLoading, pagination: rentalsPag, fetchData: fetchRentals } = useFetch("/admin/rentals");
  const { data: usersList, loading: usersLoading, pagination: usersPag, fetchData: fetchUsers } = useFetch("/admin/users");
  const { data: vendorsList, loading: vendorsLoading, pagination: vendorsPag, fetchData: fetchVendors } = useFetch("/admin/vendors");
  const { data: deliveryList, loading: deliveryLoading, pagination: deliveryPag, fetchData: fetchDeliveryBoys } = useFetch("/admin/delivery-boys");
  const { data: pendingEquipmentList, loading: pendingLoading, pagination: pendingPag, fetchData: fetchPendingEquipment } = useFetch("/admin/equipment-approvals");
  const { data: rentalRequests, loading: requestLoading, pagination: requestPag, fetchData: fetchRentalRequests } = useFetch("/admin/rental-requests");
  const { data: returnVerifications, loading: returnsLoading, pagination: returnsPag, fetchData: fetchReturnVerifications } = useFetch("/admin/returns");
  const { data: updateRequestsList, loading: updatesLoading, pagination: updatesPag, fetchData: fetchUpdateRequests } = useFetch("/admin/update-requests");

  const closeModals = () => {
    setModal({ ...modal, isOpen: false });
    setPrompt({ ...prompt, isOpen: false });
  };

  const showConfirm = (title, message, onConfirm, type = 'danger') => {
    setModal({ isOpen: true, type, title, message, onConfirm: (val) => { onConfirm(val); closeModals(); } });
  };

  const showPrompt = (title, message, onConfirm) => {
    setPrompt({ isOpen: true, title, message, onConfirm: (val) => { onConfirm(val); closeModals(); } });
  };

  // Form states for ADD / EDIT
  const [data, setData] = useState({
    name: "", price: "", category: "", quantity: 1, description: "", city: "Jaipur",
  });
  const [image, setImage] = useState(null);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const tabFetchMap = {
      manage: fetchEquipment, rentals: fetchRentals, users: fetchUsers,
      vendors: fetchVendors, delivery: fetchDeliveryBoys, equip_approvals: fetchPendingEquipment,
      rental_requests: fetchRentalRequests, returns: fetchReturnVerifications, update_requests: fetchUpdateRequests
    };
    if (tabFetchMap[activeTab]) tabFetchMap[activeTab]();
  }, [activeTab, fetchEquipment, fetchRentals, fetchUsers, fetchVendors, fetchDeliveryBoys, fetchPendingEquipment, fetchRentalRequests, fetchReturnVerifications, fetchUpdateRequests]);

  const performAction = async (method, url, successMsg, refreshFn, payload = {}) => {
    try {
      await API[method](url, payload);
      toast.success(successMsg);
      if (refreshFn) refreshFn();
    } catch (err) {
      handleError(err);
    }
  };

  const handleDeleteUser = (id) => {
    showConfirm("Delete User", "Are you sure you want to permanently delete this user? This action cannot be undone.", () => {
      performAction("delete", `/admin/users/${id}`, "User deleted", fetchUsers);
    });
  };

  const handleVendorStatus = (id, status) => {
    const action = () => {
      if (status === 'rejected') {
        showPrompt("Reject Vendor", "Please provide a reason for rejection:", (message) => {
          performAction("put", `/admin/vendors/${id}/status`, "Vendor rejected", fetchVendors, { status, message });
        });
      } else {
        performAction("put", `/admin/vendors/${id}/status`, "Vendor approved", fetchVendors, { status });
      }
    };
    showConfirm(`${status === 'approved' ? 'Approve' : 'Reject'} Vendor`, `Are you sure you want to ${status} this vendor?`, action, status === 'approved' ? 'info' : 'danger');
  };

  const handleDeliveryStatus = (id, status) => {
    const action = () => {
      if (status === 'rejected') {
        showPrompt("Reject Driver", "Please provide a reason for rejection:", (message) => {
          performAction("put", `/admin/delivery-boys/${id}/status`, "Driver rejected", fetchDeliveryBoys, { status, message });
        });
      } else {
        performAction("put", `/admin/delivery-boys/${id}/status`, "Driver approved", fetchDeliveryBoys, { status });
      }
    };
    showConfirm(`${status === 'approved' ? 'Approve' : 'Reject'} Driver`, `Are you sure you want to ${status} this delivery boy?`, action, status === 'approved' ? 'info' : 'danger');
  };

  const handleOwnerApproval = (id, status) => {
    let title = "Update Order";
    let type = "info";
    if (status === 'approved') title = "Approve Order";
    if (status === 'rejected') { title = "Reject Order"; type = "danger"; }
    if (status === 'ready_for_pickup') title = "Mark Ready for Pickup";
    if (status === 'picked_up') title = "Confirm Pickup & Payment";

    showConfirm(title, `Mark this order request as ${status.replace(/_/g, ' ')}?`, () => {
      performAction("put", `/admin/orders/${id}/status`, `Request ${status}`, fetchRentalRequests, { status });
    }, type);
  };

  const handleVerifyReturn = (id, action) => {
    if (action === 'reject') {
      showPrompt("Reject Return", "Enter penalty amount (0 for none):", (penalty) => {
        performAction("put", `/returns/verify/${id}`, "Return rejected", fetchReturnVerifications, { action, penalty_amount: Number(penalty) || 0 });
      });
    } else {
      showConfirm("Approve Return", "Approve this return and add items back to stock?", () => {
        performAction("put", `/returns/verify/${id}`, "Return approved", fetchReturnVerifications, { action });
      }, 'info');
    }
  };

  const handleAssignDriver = (id, driverId) => {
    performAction("put", `/admin/orders/${id}/assign-delivery`, "Driver assigned successfully", fetchRentalRequests, { delivery_boy_id: driverId });
  };

  const handleUpdateRequest = (id, action) => {
    showConfirm(`${action === 'approved' ? 'Approve' : 'Reject'} Request`, `Process this vendor update request as ${action}?`, () => {
      performAction("put", `/admin/update-requests/${id}`, `Request ${action}`, fetchUpdateRequests, { action });
    }, action === 'approved' ? 'info' : 'danger');
  };

  const handleEquipmentStatus = (id, status) => {
    const action = () => {
      if (status === 'rejected') {
        showPrompt("Reject Equipment", "Provide a reason for rejection:", (message) => {
          performAction("put", `/admin/equipment/${id}/status`, "Equipment rejected", fetchPendingEquipment, { status, message });
        });
      } else {
        performAction("put", `/admin/equipment/${id}/status`, "Equipment approved", fetchPendingEquipment, { status });
      }
    };
    showConfirm(`${status === 'approved' ? 'Approve' : 'Reject'} Equipment`, `Are you sure you want to ${status} this equipment?`, action, status === 'approved' ? 'info' : 'danger');
  };

  const handleAddCategory = () => {
    if (!newCat) return;
    performAction("post", "/admin/categories", "Category added", () => { setNewCat(""); fetchCategories(); }, { name: newCat });
  };

  const handleEditCategory = (id, currentName) => {
    showPrompt("Edit Category", "Enter new name for the category:", (newName) => {
      if (!newName || newName === currentName) return;
      performAction("put", `/admin/categories/${id}`, "Category updated", fetchCategories, { name: newName });
    });
  };

  const handleMarkPickedUp = (id) => {
    showConfirm("Confirm Pickup", "Has the user picked up the equipment and paid in full?", () => {
      performAction("put", `/rentals/${id}/pickup`, "Marked as Picked Up", fetchRentals);
    }, 'info');
  };

  const resetForm = () => {
    setData({ name: "", price: "", category: (categories && categories.length > 0) ? categories[0].name : "", quantity: 1, description: "", city: "Jaipur" });
    setImage(null); setEditId(null);
  };

  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async () => {
    if (!data.name || !data.price || !data.category || !data.quantity) return toast.error("Required fields missing");
    const formData = new FormData();
    Object.keys(data).forEach(key => formData.append(key, data[key]));
    if (image) formData.append("image", image);
    
    setSubmitting(true);
    try {
      if (editId) {
        await API.put(`/admin/equipment/${editId}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Equipment Updated"); setEditId(null); setActiveTab("manage"); 
      } else {
        await API.post("/admin/equipment", formData, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Equipment Added");
      }
      resetForm();
    } catch (err) { handleError(err); }
    finally { setSubmitting(false); }
  };

  useEffect(() => {
    if (categories && categories.length > 0 && !data.category) {
      setData(prev => ({ ...prev, category: categories[0].name }));
    }
  }, [categories, data.category]);

  const handleDelete = (id) => {
    showConfirm("Delete Equipment", "Permanently remove this item from inventory?", () => {
      performAction("delete", `/admin/equipment/${id}`, "Equipment deleted", fetchEquipment);
    });
  };

  const triggerEdit = (item) => {
    setEditId(item.id);
    setData({ name: item.name, price: item.price, category: item.category, quantity: item.quantity, description: item.description || "", city: item.city || "Jaipur" });
    setImage(null); setActiveTab("add"); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tabs = [
    { id: "add", label: editId ? "✏️ Edit" : "➕ Add" }, { id: "manage", label: "📋 Inventory" }, { id: "categories", label: "📁 Categories" },
    { id: "rentals", label: "🌍 Rentals" }, { id: "users", label: "👥 Users" }, { id: "vendors", label: "🏪 Vendors" },
    { id: "delivery", label: "🚚 Drivers" }, { id: "equip_approvals", label: "✅ Approvals" }, { id: "rental_requests", label: "📦 Orders" },
    { id: "returns", label: "🔄 Returns" }, { id: "update_requests", label: "📝 Requests" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 md:p-12 transition-colors">
      <div className="max-w-6xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-sm border dark:border-gray-800 overflow-hidden">
        <div className="flex border-b bg-gray-100 dark:bg-gray-800 dark:border-gray-700 overflow-x-auto whitespace-nowrap scrollbar-hide">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id !== "add") resetForm(); }} 
              className={`flex-1 min-w-[120px] py-4 px-4 font-semibold text-center transition ${activeTab === tab.id ? "bg-white dark:bg-gray-900 text-blue-600 border-t-4 border-blue-600" : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-8">
          {activeTab === "add" && <EquipmentForm data={data} setData={setData} image={image} setImage={setImage} editId={editId} resetForm={resetForm} handleSubmit={handleSubmit} categories={categories} setActiveTab={setActiveTab} submitting={submitting} />}
          {activeTab === "manage" && <InventoryManager equipmentList={equipmentList} loading={equipLoading} pagination={equipPag} fetchData={fetchEquipment} triggerEdit={triggerEdit} handleDelete={handleDelete} />}
          {activeTab === "categories" && <CategoryManager categories={categories} newCat={newCat} setNewCat={setNewCat} handleAddCategory={handleAddCategory} handleEditCategory={handleEditCategory} />}
          {activeTab === "rentals" && <GlobalRentals rentalsList={rentalsList} loading={rentalsLoading} pagination={rentalsPag} fetchData={fetchRentals} handleMarkPickedUp={handleMarkPickedUp} />}
          {activeTab === "users" && <UserManager usersList={usersList} loading={usersLoading} pagination={usersPag} fetchData={fetchUsers} handleDeleteUser={handleDeleteUser} />}
          {activeTab === "vendors" && <VendorVerifier vendorsList={vendorsList} loading={vendorsLoading} pagination={vendorsPag} fetchData={fetchVendors} handleVendorStatus={handleVendorStatus} />}
          {activeTab === "delivery" && <DeliveryVerifier deliveryList={deliveryList} loading={deliveryLoading} pagination={deliveryPag} fetchData={fetchDeliveryBoys} handleDeliveryStatus={handleDeliveryStatus} />}
          {activeTab === "equip_approvals" && <EquipmentApprover pendingEquipmentList={pendingEquipmentList} loading={pendingLoading} pagination={pendingPag} fetchData={fetchPendingEquipment} handleEquipmentStatus={handleEquipmentStatus} />}
          {activeTab === "rental_requests" && <OrderManager rentalRequests={rentalRequests} loading={requestLoading} pagination={requestPag} fetchData={fetchRentalRequests} handleOwnerApproval={handleOwnerApproval} deliveryBoys={deliveryList} handleAssignDriver={handleAssignDriver} />}
          {activeTab === "returns" && <ReturnVerifier returnVerifications={returnVerifications} loading={returnsLoading} pagination={returnsPag} fetchData={fetchReturnVerifications} handleVerifyReturn={handleVerifyReturn} />}
          {activeTab === "update_requests" && <UpdateRequestManager updateRequestsList={updateRequestsList} loading={updatesLoading} pagination={updatesPag} fetchData={fetchUpdateRequests} handleUpdateRequest={handleUpdateRequest} />}
        </div>
      </div>

      <ConfirmModal {...modal} onCancel={closeModals} />
      <PromptModal {...prompt} onCancel={closeModals} />
    </div>
  );
}