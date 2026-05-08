import { useEffect, useState } from "react";
import API from "../services/api";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import toast from "react-hot-toast";
import EmptyState from "../components/EmptyState";
import { CardSkeleton } from "../components/Skeleton";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function Cart() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [checkoutModal, setCheckoutModal] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("Jaipur");
  const [deliveryType, setDeliveryType] = useState("delivery");
  const [paymentMethod, setPaymentMethod] = useState("ONLINE");
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  
  const [deliveryLat, setDeliveryLat] = useState(26.9124);
  const [deliveryLng, setDeliveryLng] = useState(75.7873);

  const [editingDates, setEditingDates] = useState(null); // stores item.id

  function LocationMarker() {
    useMapEvents({
      click(e) {
        setDeliveryLat(e.latlng.lat);
        setDeliveryLng(e.latlng.lng);
      },
    });
    return deliveryLat && deliveryLng ? <Marker position={[deliveryLat, deliveryLng]}></Marker> : null;
  }

  useEffect(() => {
    fetchProfileAndCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfileAndCart = async () => {
    try {
      const pRes = await API.get("/user/profile");
      // Handle both {success, data} and raw object (backward compat)
      const profile = pRes.data?.data || pRes.data;
      if (profile) {
         setDeliveryAddress(profile.address || "");
         if (profile.city) setDeliveryCity(profile.city);
      }
      fetchCart();
    } catch(err) { console.error(err); fetchCart(); }
  };

  const fetchCart = async () => {
    try {
      const res = await API.get("/cart");
      setCartItems(res.data?.data || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (id) => {
    try {
      await API.delete(`/cart/${id}`);
      toast.success("Item removed from cart");
      fetchCart();
    } catch (err) {
      toast.error("Error removing item");
    }
  };

  const handleUpdateQty = async (id, newQty, stock) => {
    if (newQty < 1) newQty = 1;
    if (newQty > stock) newQty = stock;

    try {
      await API.put(`/cart/${id}`, { quantity: newQty });
      fetchCart();
    } catch (err) {
      toast.error(err.response?.data?.error || "Error updating quantity");
    }
  };

  const handleUpdateDates = async (id, range) => {
    if (!range || !range[0] || !range[1]) return;
    
    const toLocalISO = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    try {
      await API.put(`/cart/${id}`, {
        start_date: toLocalISO(range[0]),
        end_date: toLocalISO(range[1])
      });
      toast.success("Dates updated!");
      setEditingDates(null);
      fetchCart();
    } catch (err) {
      toast.error(err.response?.data?.error || "Error updating dates");
    }
  };

  const handleProceedToCheckout = () => {
    const missingDates = cartItems.some(item => !item.start_date || !item.end_date);
    if (missingDates) {
      return toast.error("Please select rental dates for all items before checking out. You can do this by re-adding the item from its details page.");
    }
    setCheckoutModal(true);
  };

  const handleConfirmRent = async () => {
    const checkoutItems = cartItems.map(item => {
      const parsedStart = new Date(item.start_date);
      const parsedEnd = new Date(item.end_date);
      const calculatedDays = Math.max(1, Math.ceil((parsedEnd - parsedStart) / (1000 * 60 * 60 * 24)));
      return {
        cart_id: item.id,
        equipment_id: item.equipment_id,
        start_date: item.start_date,
        end_date: item.end_date,
        quantity: item.cart_quantity,
        total_price: item.price * item.cart_quantity * calculatedDays,
        name: item.name
      };
    });

    if (deliveryType === 'delivery' && !deliveryAddress) return toast.error("Delivery address is required.");
    if (!agreementAccepted) return toast.error("You must accept the terms and agreements before proceeding.");

    try {
      await API.post("/check-availability", { items: checkoutItems });
      
      const res = await API.post("/rent", { 
         items: checkoutItems, 
         delivery_address: deliveryType === 'delivery' ? deliveryAddress : 'Self Pickup', 
         delivery_city: deliveryCity,
         deliveryType,
         agreementAccepted,
         paymentMethod,
         delivery_lat: deliveryType === 'delivery' ? deliveryLat : null,
         delivery_lng: deliveryType === 'delivery' ? deliveryLng : null
      });

      if (paymentMethod === 'ONLINE') {
        const { razorpayOrderId, amount, key } = res.data;
        const options = {
          key: key, 
          amount: amount,
          currency: "INR",
          name: "EquipRent",
          description: "Equipment Rental Payment",
          order_id: razorpayOrderId,
          handler: async function (response) {
            try {
              await API.post("/payment/verify", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });
              toast.success("Payment successful! Items have been rented.");
              setCheckoutModal(false);
              setAgreementAccepted(false);
              setCartItems([]);
            } catch (error) {
              toast.error("Payment verification failed.");
            }
          },
          modal: {
            ondismiss: async function () {
              await API.post("/payment/fail", { razorpay_order_id: razorpayOrderId });
              toast.error("Payment cancelled. Order placed but payment failed. You can retry payment from Rental History.", { duration: 6000 });
              setCheckoutModal(false);
              setAgreementAccepted(false);
              setCartItems([]);
            }
          },
          prefill: { email: "customer@example.com" },
          theme: { color: "#3399cc" }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        toast.success("Checkout successful! Items have been rented.");
        setCheckoutModal(false);
        setAgreementAccepted(false);
        setCartItems([]);
      }
    } catch (err) {
      if (err.response?.data?.conflicts) {
        let msg = "Availability Conflicts:\n\n";
        err.response.data.conflicts.forEach(c => msg += `- ${c.name}: ${c.msg}\n`);
        toast.error(msg, { duration: 6000 });
      } else {
        toast.error(err.response?.data?.error || "Error during checkout");
      }
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((acc, item) => {
      const calculatedDays = (item.start_date && item.end_date) 
        ? Math.max(1, Math.ceil((new Date(item.end_date) - new Date(item.start_date)) / (1000 * 60 * 60 * 24)))
        : 1;
      return acc + (item.price * item.cart_quantity * calculatedDays);
    }, 0);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold border-b pb-4 mb-6 text-gray-800">Shopping Cart</h1>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 md:p-12 transition-colors">
      <div className="max-w-5xl mx-auto bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border dark:border-gray-800 transition-colors">
        <h1 className="text-3xl font-bold border-b dark:border-gray-800 pb-4 mb-6 text-gray-800 dark:text-white">Shopping Cart</h1>
        
        {cartItems.length === 0 ? (
          <EmptyState
            icon="🛒"
            title="Your cart is empty"
            message="Looks like you haven't added any equipment to your cart yet."
            actionLabel="Browse Products"
            actionLink="/dashboard"
          />
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-6">
              {cartItems.map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row items-center gap-6 border dark:border-gray-800 p-4 rounded-xl shadow-sm bg-gray-50 dark:bg-gray-800/50 relative">
                  <div className="w-24 h-24 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden border dark:border-gray-600">
                    {item.image ? (
                      <img src={(item.image && item.image.startsWith("http") ? item.image : `http://localhost:5000${item.image}`)} alt={item.name} className="object-contain h-full w-full" />
                    ) : (
                      <span className="text-gray-400 text-3xl">📷</span>
                    )}
                  </div>
                  <div className="flex-1 w-full relative">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 pr-12">{item.name}</h2>
                    <button 
                       onClick={() => handleRemove(item.id)}
                       className="absolute top-0 right-0 text-gray-400 hover:text-red-500 text-xl"
                    >
                      &times;
                    </button>

                    <p className="text-green-600 dark:text-green-400 font-bold mt-1">₹{item.price} / day</p>
                    
                    <div className="mt-4 flex flex-wrap items-center gap-6">
                      <div className="flex items-center">
                        <label className="text-sm font-medium text-gray-700 mr-2 sr-only">Quantity</label>
                        <button aria-label="Decrease quantity" onClick={() => handleUpdateQty(item.id, item.cart_quantity - 1, item.stock)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-l hover:bg-gray-300 dark:hover:bg-gray-600 dark:text-white">-</button>
                        <span className="px-4 py-1 bg-white dark:bg-gray-800 border-y dark:border-gray-700 text-sm font-semibold dark:text-white" aria-live="polite">{item.cart_quantity}</span>
                        <button aria-label="Increase quantity" onClick={() => handleUpdateQty(item.id, item.cart_quantity + 1, item.stock)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-r hover:bg-gray-300 dark:hover:bg-gray-600 dark:text-white">+</button>
                      </div>

                      <button 
                        onClick={() => handleRemove(item.id)}
                        className="text-xs text-red-500 font-bold hover:underline sm:ml-auto"
                      >
                        Remove Item
                      </button>

                      <div className="flex flex-col text-sm text-gray-600 dark:text-gray-400 sm:ml-4 mt-2 sm:mt-0">
                         <span className="font-semibold text-indigo-600 dark:text-indigo-400">Rental Period:</span>
                         {item.start_date ? (
                           <span>{new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}</span>
                         ) : (
                           <span className="text-red-500 font-bold italic">Dates not selected</span>
                         )}
                         <button 
                           onClick={() => setEditingDates(editingDates === item.id ? null : item.id)}
                           className="text-[10px] text-blue-500 underline mt-1 text-left"
                         >
                           {item.start_date ? "Change Dates" : "Select Dates"}
                         </button>
                      </div>
                    </div>
                    {editingDates === item.id && (
                      <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-700">
                        <p className="text-xs font-bold mb-2 dark:text-white text-gray-700">Choose Rental Range:</p>
                        <div className="overflow-x-auto">
                          <Calendar 
                            selectRange={true}
                            minDate={new Date()}
                            onChange={(range) => handleUpdateDates(item.id, range)}
                            defaultValue={item.start_date ? [new Date(item.start_date), new Date(item.end_date)] : [new Date(), new Date()]}
                            className="border-0 shadow-none text-sm dark:bg-gray-800 dark:text-white"
                          />
                        </div>
                        <button onClick={() => setEditingDates(null)} className="mt-2 text-xs text-gray-500 underline">Cancel</button>
                      </div>
                    )}
                  </div>
                  <div className="text-right mt-4 sm:mt-0">
                    <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                      ₹{item.price * item.cart_quantity * (item.start_date ? Math.max(1, Math.ceil((new Date(item.end_date) - new Date(item.start_date)) / (1000 * 60 * 60 * 24))) : 1)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="w-full lg:w-80 bg-gray-100 dark:bg-gray-800 p-6 rounded-xl h-fit shadow-inner border dark:border-gray-700">
              <h3 className="text-xl font-semibold mb-4 dark:text-white">Order Summary</h3>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600 dark:text-gray-400">Total Items:</span>
                <span className="font-semibold dark:text-white">{cartItems.reduce((acc, item) => acc + item.cart_quantity, 0)}</span>
              </div>
              <div className="border-t dark:border-gray-700 my-4 py-4">
                <div className="flex justify-between text-xl font-bold text-gray-800 dark:text-white">
                  <span>Order Total:</span>
                  <span>₹{calculateTotal()}</span>
                </div>
              </div>
              <button 
                onClick={handleProceedToCheckout}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 rounded-lg shadow-md transition"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {checkoutModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto border dark:border-gray-800 transition-colors">
              <button 
                onClick={() => setCheckoutModal(false)} 
                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl leading-none"
              >&times;</button>
              
              <h3 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">Rent Confirmation</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">Confirm your delivery details and payment method below.</p>
              
              <div className="mb-4">
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Delivery Option</label>
                 <select 
                    className="w-full border dark:border-gray-700 p-3 rounded-lg focus:ring-yellow-400 focus:outline-none bg-gray-50 dark:bg-gray-800 dark:text-white" 
                    value={deliveryType}
                    onChange={(e) => setDeliveryType(e.target.value)}
                 >
                    <option value="delivery">Delivery (+₹50)</option>
                    <option value="pickup">Self Pickup (No extra charge)</option>
                 </select>
              </div>

              {deliveryType === 'delivery' && (
                <>
                  <div className="mb-4">
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Delivery Address & Location</label>
                     <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">Pin your exact location on the map.</p>
                     <div className="h-48 w-full mb-3 rounded-lg overflow-hidden shadow-inner border border-gray-300 dark:border-gray-700">
                        <MapContainer center={[deliveryLat, deliveryLng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; OpenStreetMap contributors'
                          />
                          <LocationMarker />
                        </MapContainer>
                     </div>
                     <textarea 
                        className="w-full border dark:border-gray-700 p-3 rounded-lg focus:ring-yellow-400 focus:outline-none bg-gray-50 dark:bg-gray-800 dark:text-white text-sm" 
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Enter flat/house no., floor, landmark..."
                     />
                  </div>

                  <div className="mb-6">
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Delivery City</label>
                     <select 
                        className="w-full border dark:border-gray-700 p-3 rounded-lg focus:ring-yellow-400 focus:outline-none bg-gray-50 dark:bg-gray-800 dark:text-white" 
                        value={deliveryCity}
                        onChange={(e) => setDeliveryCity(e.target.value)}
                     >
                        <option value="Jaipur">Jaipur</option>
                        <option value="Ajmer">Ajmer</option>
                     </select>
                  </div>
                 </>
              )}

              <div className="mb-4">
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Method</label>
                 <select 
                    className="w-full border dark:border-gray-700 p-3 rounded-lg focus:ring-yellow-400 focus:outline-none bg-gray-50 dark:bg-gray-800 dark:text-white font-semibold" 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                 >
                    <option value="ONLINE">💳 Online Payment (Razorpay)</option>
                    <option value="COD">💵 Cash on Delivery (COD)</option>
                 </select>
              </div>

              <div className="mb-4 bg-gray-50 dark:bg-gray-800 p-3 rounded border dark:border-gray-700 h-24 overflow-y-auto text-xs text-gray-600 dark:text-gray-400">
                 <p className="font-bold mb-1 dark:text-gray-200">Rental Terms & Conditions</p>
                 <ul className="list-disc pl-4 space-y-1">
                   <li><strong>Damage Charges:</strong> You are fully liable for damages.</li>
                   <li><strong>Fake Replacement Penalty:</strong> Penalty of 5x the equipment value.</li>
                   <li><strong>Illegal Activity:</strong> Equipment must not be used for unlawful purposes.</li>
                 </ul>
              </div>

              <div className="mb-6 flex items-start gap-2">
                 <input 
                    type="checkbox" 
                    id="agreement" 
                    className="mt-1 flex-shrink-0 cursor-pointer accent-yellow-400 h-4 w-4 rounded" 
                    checked={agreementAccepted} 
                    onChange={e => setAgreementAccepted(e.target.checked)} 
                 />
                 <label htmlFor="agreement" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                    I agree to the Rental Terms.
                 </label>
              </div>

              <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6">
                 <span className="font-semibold text-gray-700 dark:text-gray-300">Total Charged:</span>
                 <span className="text-xl font-bold text-green-600 dark:text-green-400">₹{calculateTotal() + (deliveryType === 'delivery' ? 50 : 0)}</span>
              </div>

               <button 
                 onClick={handleConfirmRent} 
                 disabled={!agreementAccepted}
                 className={`w-full font-bold py-3 rounded-lg shadow transition ${agreementAccepted ? 'bg-black dark:bg-yellow-400 dark:text-black hover:bg-gray-800 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
               >
                 Confirm & Pay
               </button>
           </div>
        </div>
      )}
    </div>
  );
}
