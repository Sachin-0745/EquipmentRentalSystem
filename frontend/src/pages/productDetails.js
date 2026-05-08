import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import Calendar from 'react-calendar';
import toast from "react-hot-toast";
import EmptyState from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";
import 'react-calendar/dist/Calendar.css';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  
  const [dateRange, setDateRange] = useState([new Date(), new Date()]);
  const [bookedDates, setBookedDates] = useState({});

  useEffect(() => {
    fetchProduct();
    fetchReviews();
    fetchAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchAvailability = async () => {
    try {
      const res = await API.get(`/equipment/${id}/booked-dates`);
      setBookedDates(res.data.booked_dates || {});
    } catch (err) {
      console.error("Error fetching availability:", err);
    }
  };


  const fetchProduct = async () => {
    try {
      const res = await API.get(`/equipment/${id}`);
      setProduct(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await API.get(`/equipment/${id}/reviews`);
      // Support both new { success, data: [] } and legacy [] formats
      const data = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setReviews(data);
    } catch (err) {
      console.error(err);
      setReviews([]);
    }
  };


  const isDateBooked = (date) => {
    if (!product) return false;
    const d = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    const dateStr = d.toISOString().split('T')[0];
    const bookedQty = bookedDates[dateStr] || 0;
    return (bookedQty + qty) > product.quantity;
  };

  const handleAddToCart = async (redirect = false) => {
    if (qty > product.quantity) return toast.error("Cannot exceed available total stock!");
    if (!dateRange || !dateRange[0] || !dateRange[1]) return toast.error("Please select your rental dates on the calendar.");
    
    let current = new Date(dateRange[0]);
    current.setHours(12,0,0,0);
    const end = new Date(dateRange[1]);
    end.setHours(12,0,0,0);
    
    while (current <= end) {
       if (isDateBooked(current)) {
          return toast.error("One or more dates in your selected range are fully booked for the requested quantity. Please adjust your dates or lower the quantity.");
       }
       current.setDate(current.getDate() + 1);
    }

    const toLocalISO = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    try {
      await API.post("/cart", { 
        equipment_id: product.id, 
        quantity: qty,
        start_date: toLocalISO(dateRange[0]),
        end_date: toLocalISO(dateRange[1])
      });
      if (redirect) {
        navigate("/cart");
      } else {
        toast.success("Added to cart!");
      }
    } catch (err) {
       toast.error(err.response?.data?.error || "Error adding to cart");
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12">
       <div className="max-w-6xl mx-auto bg-white p-8 rounded-2xl shadow-sm border flex flex-col md:flex-row gap-10">
          <Skeleton className="md:w-1/2 h-96 rounded-xl" />
          <div className="md:w-1/2 flex flex-col pt-4 gap-4">
             <Skeleton className="h-6 w-1/4" />
             <Skeleton className="h-10 w-3/4" />
             <Skeleton className="h-6 w-1/3" />
             <Skeleton className="h-16 w-full" />
             <Skeleton className="h-32 w-full mt-4" />
          </div>
       </div>
    </div>
  );
  if (!product) return <div className="p-10 text-center text-xl text-red-500">Product Not Found</div>;

  const avgRating = (parseFloat(product.avg_rating) || 0).toFixed(1);


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 md:p-12 transition-colors">
      <div className="max-w-6xl mx-auto bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border dark:border-gray-800">
        <div className="flex flex-col md:flex-row gap-10">
          
          {/* Left: Image Viewer */}
          <div className="md:w-1/2 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
             {product.image ? (
                <img src={(product.image && product.image.startsWith("http") ? product.image : `http://localhost:5000${product.image}`)} alt={product.name} className="object-contain w-full h-96 mix-blend-multiply dark:mix-blend-normal" loading="lazy" />

             ) : (
                <span className="text-gray-300 dark:text-gray-600 text-9xl">📷</span>
             )}
          </div>

          {/* Right: Details & Actions */}
          <div className="md:w-1/2 flex flex-col pt-4">
             <p className="text-sm font-semibold text-blue-500 dark:text-blue-400 uppercase tracking-widest mb-1">{product.category}</p>
             <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight mb-2">{product.name}</h1>
             
             <div className="flex items-center gap-2 mb-4">
                <span className="text-yellow-500 text-xl font-bold">★ {avgRating}</span>
                <span className="text-blue-500 dark:text-blue-400 text-sm hover:underline cursor-pointer">({product.review_count} ratings)</span>
             </div>

             <div className="border-t border-b dark:border-gray-800 py-4 my-2">
                <div className="text-4xl font-extrabold text-gray-900 dark:text-white">
                  <span className="text-lg align-top font-normal text-gray-500 dark:text-gray-400 font-sans">₹</span>{product.price}
                  <span className="text-lg text-gray-500 dark:text-gray-400 font-normal"> / day</span>
                </div>
                {product.quantity > 0 ? (
                  <p className="text-green-600 dark:text-green-400 font-bold mt-2 text-sm">In Stock (Available Now: {product.available_quantity != null ? product.available_quantity : product.quantity} | Total: {product.quantity})</p>
                ) : (
                  <p className="text-red-500 dark:text-red-400 font-bold mt-2 text-sm">Currently Unavailable.</p>
                )}
             </div>

             {/* Dynamic Description Box */}
             <div className="my-4 text-gray-700 dark:text-gray-300 leading-relaxed min-h-[100px]">
                {product.description ? (
                  <p className="whitespace-pre-wrap">{product.description}</p>
                ) : (
                  <p className="italic text-gray-400 dark:text-gray-600">No detailed description provided by the seller.</p>
                )}
             </div>

             {/* Action Block */}
             <div className="flex flex-col gap-4 mt-auto pt-6 border-t dark:border-gray-800">
               {product.quantity > 0 ? (
                 <>
                   <div className="mb-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-2">Select Rental Dates:</label>
                      <div className="border dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-800 shadow-sm inline-block w-full overflow-x-auto">
                        <Calendar 
                          selectRange={true}
                          minDate={new Date()}
                          onChange={setDateRange}
                          value={dateRange}
                          tileDisabled={({ date }) => isDateBooked(date)}
                          className="border-0 shadow-none text-sm w-full dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Quantity:</label>
                      <input 
                         type="number" min="1" max={product.quantity}
                         className="w-20 p-2 border dark:border-gray-700 rounded-lg text-center font-bold focus:ring-2 focus:ring-yellow-400 focus:outline-none bg-white dark:bg-gray-800 dark:text-white"
                         value={qty}
                         onChange={e => setQty(Math.min(product.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                      />
                   </div>
                   <div className="flex flex-col sm:flex-row gap-3">
                      <button onClick={() => handleAddToCart(false)} className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3 px-6 rounded-full shadow transition text-sm">
                         Add to Cart
                      </button>
                      <button onClick={() => handleAddToCart(true)} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-full shadow transition text-sm">
                         Rent Now
                      </button>
                   </div>
                 </>
               ) : (
                 <button disabled className="w-full bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-bold py-3 px-6 rounded-full shadow cursor-not-allowed">
                     Out of Stock
                 </button>
               )}
             </div>

          </div>
        </div>
      </div>

      {/* Review Section */}
      <div className="max-w-6xl mx-auto mt-8 bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border dark:border-gray-800">
         <h2 className="text-2xl font-bold border-b dark:border-gray-800 pb-3 mb-6 dark:text-white">Customer Reviews</h2>
         
         {reviews.length === 0 ? (
           <EmptyState icon="💬" title="No reviews yet" message="Be the first to rent and review!" />
         ) : (
           <div className="space-y-6">
             {reviews.map(r => (
               <div key={r.id} className="border-b dark:border-gray-800 pb-4">
                  <div className="flex items-center gap-3 mb-2">
                     <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300">
                        {(r.user_name || "A").charAt(0).toUpperCase()}
                     </div>
                     <div>
                        <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{r.user_name || "Anonymous"}</p>
                        <p className="text-yellow-500 text-sm">{"★".repeat(r.rating || 0)}{"☆".repeat(5 - (r.rating || 0))}</p>
                     </div>

                  </div>
                  <p className="text-gray-700 dark:text-gray-400 ml-12 whitespace-pre-wrap">{r.comment}</p>
               </div>
             ))}
           </div>
         )}
      </div>
    </div>

  );
}
