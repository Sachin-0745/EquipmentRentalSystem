import { useEffect, useState, useCallback } from "react";
import API from "../services/api";
import toast from "react-hot-toast";
import EmptyState from "../components/EmptyState";
import { CardSkeleton } from "../components/Skeleton";

// Simple pagination bar
function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, hasNextPage, hasPrevPage } = pagination;
  return (
    <div className="flex items-center justify-center gap-3 mt-8">
      <button disabled={!hasPrevPage} onClick={() => onPageChange(page - 1)}
        className="px-4 py-2 rounded-lg border font-semibold text-sm disabled:opacity-40 hover:bg-indigo-50 transition">
        ← Prev
      </button>
      <span className="text-sm text-gray-600 font-semibold">Page {page} / {totalPages}</span>
      <button disabled={!hasNextPage} onClick={() => onPageChange(page + 1)}
        className="px-4 py-2 rounded-lg border font-semibold text-sm disabled:opacity-40 hover:bg-indigo-50 transition">
        Next →
      </button>
    </div>
  );
}

export default function RentalHistory() {
  const [rentals, setRentals]       = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading]       = useState(true);

  const [reviewModal, setReviewModal] = useState({ show: false, equipment_id: null });
  const [reviewData, setReviewData]   = useState({ rating: 5, comment: "" });
  const [returnModal, setReturnModal] = useState({ show: false, rental: null, method: 'self_return' });
  const [contactModal, setContactModal] = useState({ show: false, data: null, loading: false });

  const fetchRentals = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await API.get(`/rentals/track?page=${page}&limit=10`);
      // Support both paginated and legacy response shapes
      if (res.data?.pagination) {
        setRentals(res.data.data || []);
        setPagination(res.data.pagination);
      } else {
        setRentals(Array.isArray(res.data) ? res.data : res.data?.data || []);
        setPagination(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRentals(1); }, [fetchRentals]);

  const handlePageChange = useCallback((p) => {
    setCurrentPage(p);
    fetchRentals(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [fetchRentals]);

  const handleCancel = useCallback(async (id) => {
    if (!window.confirm("Are you sure you want to cancel this order? This will release the stock and notify the vendor/driver.")) return;
    try {
      const res = await API.post(`/rentals/cancel/${id}`);
      toast.success(res.data.message);
      fetchRentals(currentPage);
    } catch (err) {
      toast.error(err.response?.data?.error || "Error cancelling order");
    }
  }, [fetchRentals, currentPage]);

  const handleSwitchPickup = useCallback(async (id) => {
    if (!window.confirm("Switch to self-pickup? You will need to visit the store to collect your equipment.")) return;
    try {
      await API.put(`/rentals/switch-pickup/${id}`);
      toast.success("Switched to self-pickup!");
      fetchRentals(currentPage);
    } catch (err) {
      toast.error(err.response?.data?.error || "Error switching delivery method");
    }
  }, [fetchRentals, currentPage]);

  const submitReturn = useCallback(async () => {
    try {
      await API.post(`/rentals/return/${returnModal.rental.id}`, { return_method: returnModal.method });
      toast.success("Return request processed successfully!");
      fetchRentals(currentPage);
      setReturnModal({ show: false, rental: null, method: 'self_return' });
    } catch (err) {
      toast.error(err.response?.data?.error || "Error returning equipment");
    }
  }, [returnModal, fetchRentals, currentPage]);

  const openReview = (equipment_id) => {
    setReviewModal({ show: true, equipment_id });
    setReviewData({ rating: 5, comment: "" });
  };

  const submitReview = async () => {
    if (reviewData.comment.length > 250) return toast.error("Comment cannot exceed 250 characters");
    try {
      await API.post("/reviews", { 
        equipment_id: reviewModal.equipment_id,
        rating: reviewData.rating,
        comment: reviewData.comment,
        review: reviewData.comment
      });
      toast.success("Review posted successfully!");
      setReviewModal({ show: false, equipment_id: null });
    } catch (err) {
      toast.error(err.response?.data?.error || "Error posting review");
    }
  };

  const fetchContact = async (rentalId) => {
    setContactModal({ show: true, data: null, loading: true });
    try {
      const res = await API.get(`/rentals/${rentalId}/contact`);
      setContactModal({ show: true, data: res.data.data, loading: false });
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not fetch contact info");
      setContactModal({ show: false, data: null, loading: false });
    }
  };

  const handleRetryPayment = async (rentalId) => {
    try {
      const res = await API.post(`/payment/retry/${rentalId}`);
      const { razorpayOrderId, amount, key } = res.data;
      const options = {
          key: key, 
          amount: amount,
          currency: "INR",
          name: "EquipRent",
          description: "Retry Equipment Rental Payment",
          order_id: razorpayOrderId,
          handler: async function (response) {
            try {
              await API.post("/payment/verify", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });
              toast.success("Payment successful!");
              fetchRentals();
            } catch (error) {
              toast.error("Payment verification failed.");
            }
          },
          modal: {
            ondismiss: async function () {
              await API.post("/payment/fail", { razorpay_order_id: razorpayOrderId });
              toast.error("Payment cancelled again.");
              fetchRentals();
            }
          },
          prefill: { email: "customer@example.com" },
          theme: { color: "#3399cc" }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.error || "Error retrying payment");
    }
  };

  const getDeliveryStep = (status, deliveryType, mainStatus) => {
    // If it's in return phase
    if (mainStatus === 'return_requested') return 0;
    if (mainStatus === 'returned') return 1;
    if (mainStatus === 'completed') return 2;

    if (deliveryType === 'pickup') {
      if (status === 'pending') return 0;
      if (status === 'ready_for_pickup') return 1;
      if (status === 'delivered') return 2;
      return 0;
    }
    const steps = ['pending', 'assigned', 'picked_up', 'out_for_delivery', 'delivered'];
    return Math.max(0, steps.indexOf(status));
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12 relative">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-800 border-b pb-4 mb-6">Your Orders &amp; Rentals</h1>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 md:p-12 relative transition-colors">
      <div className="max-w-6xl mx-auto bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border dark:border-gray-800">
        <div className="flex justify-between items-center border-b dark:border-gray-800 pb-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Your Orders &amp; Rentals</h1>
          {pagination && (
            <span className="text-sm text-gray-400 dark:text-gray-500">{pagination.totalItems} orders total</span>
          )}
        </div>

        {rentals.length === 0 ? (
          <EmptyState
            icon="📅"
            title="No rental history"
            message="You have not rented any equipment yet."
            actionLabel="Start Shopping"
            actionLink="/dashboard"
          />
        ) : (
          <div className="space-y-8">
            {rentals.map((rental) => {
              const isPickup = rental.delivery_type === 'pickup';
              const isReturning = rental.status === 'return_requested' || rental.status === 'returned';
              const currentStep = getDeliveryStep(rental.delivery_status, rental.delivery_type, rental.status);
              
              let stepsArray = isPickup ? ['Ordered', 'Ready for Pickup', 'Picked Up'] : ['Ordered', 'Assigned', 'Picked', 'Shipping', 'Arrived'];
              let maxSteps = isPickup ? 2 : 4;

              if (isReturning) {
                stepsArray = ['Return Requested', 'Picked Up', 'Completed'];
                maxSteps = 2;
              }

              const isClosed = ['cancelled', 'return_issue', 'completed'].includes(rental.status);
              const canCancel = !isClosed && !isReturning && rental.delivery_status !== 'delivered' && rental.delivery_status !== 'failed';
              const canReturn = !isClosed && !isReturning && rental.delivery_status === 'delivered' && rental.status === 'active';

              return (
                <div key={rental.id} className={`border rounded-2xl p-6 transition-all ${isClosed ? 'bg-gray-50 dark:bg-gray-800/40 opacity-80' : 'bg-white dark:bg-gray-800 shadow-md border-indigo-100 dark:border-gray-700'}`}>
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-48 h-32 bg-gray-100 dark:bg-gray-700 flex items-center justify-center rounded-xl overflow-hidden border dark:border-gray-600">
                      {rental.image ? (
                        <img src={(rental.image && rental.image.startsWith("http") ? rental.image : `http://localhost:5000${rental.image}`)} alt={rental.name} className="object-contain w-full h-full mix-blend-multiply dark:mix-blend-normal" loading="lazy" />

                      ) : (
                        <span className="text-gray-300 dark:text-gray-600 text-5xl">📦</span>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                         <div>
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{rental.name}</h2>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Order #{rental.id} • Qty: {rental.quantity}</p>
                         </div>
                         <div className="text-right">
                           <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                             rental.status === 'active' ? 'bg-indigo-100 text-indigo-700' :
                             rental.status === 'returned' ? 'bg-green-100 text-green-700' :
                             rental.status.includes('return_') || rental.status.includes('pickup_') || rental.status === 'under_verification' ? 'bg-blue-100 text-blue-700' :
                             'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                           }`}>
                             {rental.status.replace(/_/g, ' ')}
                           </span>
                           <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">₹{rental.total_price}</p>
                            <div className="mt-2 text-[10px] font-bold uppercase dark:text-gray-400">
                              Payment: <span className={`${
                                rental.payment_status === 'paid' ? 'text-green-600' : 'text-orange-500'
                              }`}>
                                {rental.payment_status === 'paid' ? 'PAID' : (rental.payment_method === 'COD' ? 'PENDING (COD/UNPAID)' : 'PENDING')}
                              </span>
                            </div>
                         </div>
                      </div>

                      {/* TRACKING STEPPER */}
                      {!isClosed && (
                        <div className="mt-6 mb-8">
                           <div className="flex justify-between items-center relative">
                              <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-100 dark:bg-gray-700 -translate-y-1/2 z-0"></div>
                              <div className="absolute left-0 top-1/2 h-1 bg-indigo-500 -translate-y-1/2 z-0 transition-all duration-500" style={{ width: `${(currentStep / maxSteps) * 100}%` }}></div>
                              
                              {stepsArray.map((step, idx) => (
                                <div key={step} className="relative z-10 flex flex-col items-center">
                                   <div className={`w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 transition-colors duration-500 ${currentStep >= idx ? 'bg-indigo-500 shadow-sm' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                   <span className={`text-[9px] font-bold mt-1 uppercase ${currentStep >= idx ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}`}>{step}</span>
                                </div>
                              ))}
                           </div>
                        </div>
                      )}

                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-auto">
                        <div className="text-sm">
                           {rental.start_date && <p className="text-gray-600 dark:text-gray-400">Rental: <span className="font-bold">{new Date(rental.start_date).toLocaleDateString()}</span> - <span className="font-bold">{new Date(rental.end_date).toLocaleDateString()}</span></p>}
                           {isPickup && rental.delivery_status === 'ready_for_pickup' && (
                             <p className="text-yellow-600 dark:text-yellow-500 font-bold mt-1">🏪 Order is ready for pickup (you have not picked it up yet)</p>
                           )}
                           {!isPickup && rental.driver_name && rental.delivery_status !== 'delivered' && (
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <p className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">🚚 Driver: {rental.driver_name}</p>
                                <button
                                  onClick={() => fetchContact(rental.id)}
                                  className="text-xs bg-indigo-100 dark:bg-indigo-900/40 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold px-3 py-1 rounded-lg transition"
                                >📞 Contact Driver</button>
                              </div>
                           )}
                           {rental.status === 'completed' && (
                             <p className="text-green-600 dark:text-green-400 font-bold mt-2">✅ Equipment returned and order completed successfully</p>
                           )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                           {rental.payment_method === 'ONLINE' && ['pending', 'failed'].includes(rental.payment_status) && !isClosed && (
                              <button onClick={() => handleRetryPayment(rental.id)} className="px-4 py-2 bg-yellow-400 text-black font-black text-xs rounded-lg hover:bg-yellow-500 transition uppercase">Retry Payment</button>
                           )}
                           {rental.delivery_status === 'failed' && (
                               <div className="w-full flex flex-col gap-3 p-4 bg-red-50 dark:bg-red-900/10 border-2 border-red-200 dark:border-red-800 rounded-xl mb-4">
                                  <p className="text-red-700 dark:text-red-400 text-sm font-bold">
                                    😞 We're sorry! Home delivery is currently unavailable in your area as all our delivery partners are occupied.
                                  </p>
                                  <div className="flex gap-2">
                                     <button onClick={() => handleSwitchPickup(rental.id)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs uppercase transition shadow-md">Self Pickup Instead</button>
                                     <button onClick={() => handleCancel(rental.id)} className="flex-1 border-2 border-red-500 text-red-500 font-bold py-2 rounded-lg text-xs uppercase hover:bg-red-50 dark:hover:bg-red-900/20 transition">Cancel Order</button>
                                  </div>
                               </div>
                            )}
                           {canCancel && (
                              <button onClick={() => handleCancel(rental.id)} className="px-4 py-2 border-2 border-red-500 text-red-500 font-black text-xs rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition uppercase">Cancel Order</button>
                           )}
                           {canReturn && (
                              <button onClick={() => setReturnModal({ show: true, rental: rental, method: 'self_return' })} className="px-4 py-2 bg-indigo-600 text-white font-black text-xs rounded-lg hover:bg-indigo-700 transition uppercase">Return Equipment</button>
                           )}
                           {['active', 'completed'].includes(rental.status) && (
                              <button onClick={() => openReview(rental.equipment_id)} className="px-4 py-2 bg-yellow-400 text-black font-black text-xs rounded-lg hover:bg-yellow-500 transition uppercase">Review Product</button>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Pagination pagination={pagination} onPageChange={handlePageChange} />
      </div>

      {/* Review Modal */}
      {reviewModal.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-8 relative">
              <button onClick={() => setReviewModal({ show: false, equipment_id: null })} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-3xl leading-none transition">&times;</button>
              <h3 className="text-2xl font-black mb-6 text-gray-800 dark:text-white">Share your experience</h3>
              
              <div className="mb-6">
                 <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Rating</label>
                 <select className="w-full border-2 dark:border-gray-700 p-3 rounded-xl focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none font-bold bg-white dark:bg-gray-900 dark:text-white" value={reviewData.rating} onChange={e => setReviewData({...reviewData, rating: parseInt(e.target.value)})}>
                    <option value={5}>⭐⭐⭐⭐⭐ (Perfect)</option>
                    <option value={4}>⭐⭐⭐⭐ (Very Good)</option>
                    <option value={3}>⭐⭐⭐ (Good)</option>
                    <option value={2}>⭐⭐ (Not Bad)</option>
                    <option value={1}>⭐ (Poor)</option>
                 </select>
              </div>

              <div className="mb-6">
                 <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Comment</label>
                 <textarea 
                    className="w-full border-2 dark:border-gray-700 p-3 rounded-xl focus:ring-yellow-400 focus:border-yellow-400 focus:outline-none h-32 resize-none bg-white dark:bg-gray-900 dark:text-white" 
                    placeholder="Tell others what you thought of this equipment..."
                    value={reviewData.comment}
                    onChange={e => setReviewData({...reviewData, comment: e.target.value})}
                    maxLength={250}
                 />
                 <div className="flex justify-between mt-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Max 250 Characters</span>
                    <span className={`text-[10px] font-bold ${reviewData.comment.length > 200 ? 'text-red-500' : 'text-gray-400'}`}>{reviewData.comment.length}/250</span>
                 </div>
              </div>

               <button onClick={submitReview} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-lg transition transform active:scale-95 uppercase tracking-widest">
                 Post Review
               </button>
           </div>
        </div>
      )}
       {/* Return Modal */}
      {returnModal.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
              <button onClick={() => setReturnModal({ show: false, rental: null, method: 'self_return' })} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-3xl leading-none transition">&times;</button>
              <h3 className="text-2xl font-black mb-2 text-gray-800 dark:text-white">Return Equipment</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">How would you like to return your '{returnModal.rental?.name}'?</p>
              
              <div className="space-y-4 mb-6">
                 <label className={`block border-2 p-4 rounded-xl cursor-pointer transition ${returnModal.method === 'self_return' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'}`}>
                    <div className="flex items-center gap-3">
                       <input type="radio" name="return_method" value="self_return" checked={returnModal.method === 'self_return'} onChange={() => setReturnModal({...returnModal, method: 'self_return'})} className="w-5 h-5 text-indigo-600" />
                       <div>
                          <p className="font-bold text-gray-800 dark:text-gray-200">Self Return</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Drop off the equipment at the store.</p>
                       </div>
                    </div>
                 </label>
                 
                 <label className={`block border-2 p-4 rounded-xl cursor-pointer transition ${returnModal.method === 'pickup' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'}`}>
                    <div className="flex items-center gap-3">
                       <input type="radio" name="return_method" value="pickup" checked={returnModal.method === 'pickup'} onChange={() => setReturnModal({...returnModal, method: 'pickup'})} className="w-5 h-5 text-indigo-600" />
                       <div>
                          <p className="font-bold text-gray-800 dark:text-gray-200">Request Pickup</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">We'll assign a delivery driver to pick it up.</p>
                       </div>
                    </div>
                 </label>
              </div>

              <button onClick={submitReturn} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-lg transition transform active:scale-95 uppercase tracking-widest">
                 Confirm Return
              </button>
           </div>
        </div>
      )}

      {/* Contact Info Modal (Feature 6 - Secure Contact Sharing) */}
      {contactModal.show && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-8 relative">
            <button onClick={() => setContactModal({ show: false, data: null, loading: false })}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-3xl leading-none transition">&times;</button>
            <h3 className="text-xl font-black mb-4 text-gray-800 dark:text-white">📞 Contact Information</h3>
            {contactModal.loading ? (
              <p className="text-center text-gray-400 py-6">Loading secure contact details...</p>
            ) : contactModal.data ? (
              <div className="space-y-4">
                {contactModal.data.driver && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
                    <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-1">Your Delivery Driver</p>
                    <p className="text-lg font-black text-gray-800 dark:text-white">{contactModal.data.driver.name}</p>
                    <a href={`tel:${contactModal.data.driver.phone}`}
                      className="text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:underline flex items-center gap-1 mt-1">
                      📱 {contactModal.data.driver.phone}
                    </a>
                  </div>
                )}
                {!contactModal.data.driver && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">No delivery driver assigned yet.</p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Contact info is only shared for active orders and auto-removed after delivery.</p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>

  );
}
