import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { CardSkeleton } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import { handleError } from "../utils/errorHandler";
import { useFetch } from "../hooks/useFetch";

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Pagination controls component ─────────────────────────────────────────────
function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, hasNextPage, hasPrevPage, totalItems } = pagination;

  return (
    <div className="flex items-center justify-between mt-10 flex-wrap gap-4">
      <p className="text-sm text-gray-500">
        Showing page <strong>{page}</strong> of <strong>{totalPages}</strong>
        &nbsp;({totalItems} items)
      </p>
      <div className="flex gap-2">
        <button
          disabled={!hasPrevPage}
          onClick={() => onPageChange(page - 1)}
          className="px-4 py-2 rounded-lg border font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-50 transition"
        >
          ← Prev
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => Math.abs(p - page) <= 2)
          .map(p => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold border transition ${
                p === page
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "hover:bg-indigo-50"
              }`}
            >
              {p}
            </button>
          ))}
        <button
          disabled={!hasNextPage}
          onClick={() => onPageChange(page + 1)}
          className="px-4 py-2 rounded-lg border font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-50 transition"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [items, setItems]           = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch]         = useState("");
  const [category, setCategory]     = useState("");
  const [sort, setSort]             = useState("");
  const [city, setCity]             = useState(localStorage.getItem("userCity") || "");
  const [showCityModal, setShowCityModal] = useState(!localStorage.getItem("userCity"));
  const [loading, setLoading]       = useState(false);
  const [minPrice, setMinPrice]     = useState("");
  const [maxPrice, setMaxPrice]     = useState("");
  const navigate                    = useNavigate();

  const debouncedSearch   = useDebounce(search, 400);
  const debouncedMinPrice = useDebounce(minPrice, 600);
  const debouncedMaxPrice = useDebounce(maxPrice, 600);

  // Use centralized hook for categories
  const { data: categoriesList, fetchData: fetchCategories } = useFetch("/categories");

  const fetchItems = useCallback(async (page = 1) => {
    if (!city) return;
    setLoading(true);
    try {
      const hasAdvanced = debouncedSearch || debouncedMinPrice || debouncedMaxPrice;
      const endpoint    = hasAdvanced ? "/equipment/search" : "/equipment";
      const params = new URLSearchParams({
        city,
        page,
        limit: 12,
        ...(debouncedSearch   && { q: debouncedSearch }),
        ...(category          && { category }),
        ...(debouncedMinPrice && { min_price: debouncedMinPrice }),
        ...(debouncedMaxPrice && { max_price: debouncedMaxPrice }),
      });
      if (!hasAdvanced && category) params.set("category", category);
      const res = await API.get(`${endpoint}?${params}`);
      if (res.data?.pagination) {
        setItems(res.data.data || []);
        setPagination(res.data.pagination);
      } else {
        setItems(Array.isArray(res.data) ? res.data : res.data?.data || []);
        setPagination(null);
      }
    } catch (err) {
      handleError(err, "Failed to load equipment list");
    } finally {
      setLoading(false);
    }
  }, [city, debouncedSearch, category, debouncedMinPrice, debouncedMaxPrice]);

  useEffect(() => {
    setCurrentPage(1);
    fetchItems(1);
  }, [city, debouncedSearch, category, debouncedMinPrice, debouncedMaxPrice, fetchItems]);

  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return; }
    fetchItems(currentPage);
  }, [currentPage, fetchItems]);

  const sortedItems = useMemo(() => {
    if (!sort) return items;
    return [...items].sort((a, b) => {
      if (sort === "low")    return a.price - b.price;
      if (sort === "high")   return b.price - a.price;
      if (sort === "rating") return (b.avg_rating || 0) - (a.avg_rating || 0);
      return 0;
    });
  }, [items, sort]);

  const handleCitySelect = useCallback((selectedCity) => {
    localStorage.setItem("userCity", selectedCity);
    setCity(selectedCity);
    setShowCityModal(false);
  }, []);

  const handleAddToCart = useCallback(async (equipmentId, maxStock, e) => {
    e.stopPropagation();
    if (maxStock <= 0) return toast.error("Cannot add more than available stock!");

    try {
      await API.post("/cart", { 
        equipment_id: equipmentId, 
        quantity: 1
      });
      toast.success("Added to cart!");
    } catch (err) {
      handleError(err, "Error adding to cart");
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handlePageChange = useCallback((p) => {
    setCurrentPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 transition-colors pb-12 relative">
      {showCityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center transform transition-all">
            <div className="text-5xl mb-4">📍</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">Select Your City</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">Choose your location to explore rental equipment strictly available near you.</p>
            <div className="flex flex-col gap-4">
              <button onClick={() => handleCitySelect("Jaipur")} className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-md text-white font-bold py-3 px-4 rounded-xl transition duration-200 text-lg">🌍 Jaipur</button>
              <button onClick={() => handleCitySelect("Ajmer")} className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-md text-white font-bold py-3 px-4 rounded-xl transition duration-200 text-lg">🌍 Ajmer</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 shadow-sm p-4 sticky top-16 z-40 transition-colors">
        <div className="container mx-auto flex flex-col gap-3">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-1/3">
              <label htmlFor="dashboard-search" className="sr-only">Search products</label>
              <input
                id="dashboard-search"
                aria-label="Search products"
                placeholder="Search products…"
                className="w-full p-2 pl-9 border dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white dark:bg-gray-800 dark:text-white"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">🔍</span>
            </div>
            <div className="flex gap-4 w-full md:w-auto overflow-x-auto">
              <select
                aria-label="Filter by city"
                className="p-2 border dark:border-gray-700 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 focus:outline-none font-semibold text-indigo-800 dark:text-indigo-300 cursor-pointer"
                value={city}
                onChange={e => handleCitySelect(e.target.value)}
              >
                <option value="Jaipur">📍 Jaipur</option>
                <option value="Ajmer">📍 Ajmer</option>
              </select>
              <select
                aria-label="Filter by category"
                className="p-2 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:outline-none min-w-[150px] dark:text-white"
                value={category}
                onChange={e => { setCategory(e.target.value); setCurrentPage(1); }}
              >
                <option value="">All Categories</option>
                {categoriesList.map((cat) => (
                  <option key={cat.id || cat._id} value={cat.name} className="capitalize">
                    {cat.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Sort products"
                className="p-2 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:outline-none dark:text-white"
                value={sort}
                onChange={e => setSort(e.target.value)}
              >
                <option value="">Sort By</option>
                <option value="low">Price: Low to High</option>
                <option value="high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wide">Price (₹/day):</span>
            <input
              id="filter-min-price" type="number" min="0" placeholder="Min"
              className="w-24 p-1.5 border dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white dark:bg-gray-800 dark:text-white"
              value={minPrice} onChange={e => { setMinPrice(e.target.value); setCurrentPage(1); }}
            />
            <span className="text-gray-400 text-sm">—</span>
            <input
              id="filter-max-price" type="number" min="0" placeholder="Max"
              className="w-24 p-1.5 border dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white dark:bg-gray-800 dark:text-white"
              value={maxPrice} onChange={e => { setMaxPrice(e.target.value); setCurrentPage(1); }}
            />
            {(minPrice || maxPrice) && (
              <button className="text-xs text-red-500 underline" onClick={() => { setMinPrice(""); setMaxPrice(""); }}>Clear</button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto mt-8 px-4">
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" aria-label="Loading products">
            {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        )}

        {!loading && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {sortedItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/equipment/${item.id}`)}
                  className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm hover:shadow-lg transition flex flex-col h-full border border-transparent hover:border-gray-200 dark:hover:border-gray-700 cursor-pointer"
                >
                  <div className="w-full h-48 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden relative pt-2 pb-2">
                    {item.image ? (
                      <img
                        src={item.image.startsWith("http") ? item.image : `http://localhost:5000${item.image}`}
                        alt={item.name}
                        className="object-contain h-full mix-blend-multiply dark:mix-blend-normal"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600 text-6xl">📷</span>
                    )}
                    <div className={`absolute top-2 left-2 text-white text-xs font-bold px-2 py-1 rounded shadow ${item.quantity <= 0 ? 'bg-red-500' : 'bg-green-500'}`}>
                      {item.quantity <= 0 ? "Out of Stock" : "In Stock"}
                    </div>
                  </div>

                  <div className="mt-4 flex-1 flex flex-col">
                    <p className="text-xs text-blue-500 dark:text-blue-400 font-semibold uppercase tracking-wide mb-1 flex justify-between">
                      <span>{item.category}</span>
                      {parseFloat(item.avg_rating) > 0 && (
                        <span className="text-yellow-500 font-bold tracking-normal">★ {parseFloat(item.avg_rating).toFixed(1)}</span>
                      )}
                    </p>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white leading-tight mt-1 line-clamp-2 hover:text-blue-600 transition">{item.name}</h2>
                    <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-100 dark:border-gray-700 flex flex-col">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Sold by</span>
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200 line-clamp-1">{item.shop_name || "EquipRent Official Store"}</span>
                      {item.store_address && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1" title={item.store_address}>📍 {item.store_address}</span>
                      )}
                    </div>
                    <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                      <span className="text-sm align-top">₹</span>{item.price}<span className="text-sm text-gray-500 dark:text-gray-400 font-normal"> / day</span>
                    </div>
                    <div className="mt-auto pt-4 flex flex-col gap-2">
                      <button
                        onClick={e => handleAddToCart(item.id, item.available_quantity ?? item.quantity, e)}
                        disabled={(item.available_quantity ?? item.quantity) <= 0}
                        className={`w-full py-2 z-10 rounded-lg font-semibold transition ${
                          (item.available_quantity ?? item.quantity) > 0 ? "bg-yellow-400 hover:bg-yellow-500 text-black shadow-sm" : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        {(item.available_quantity ?? item.quantity) > 0 ? "Add to Cart" : "Out of Stock"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {sortedItems.length === 0 && (
              <EmptyState icon="📦" title="No products found" message="Try adjusting your filters or search criteria." />
            )}

            <Pagination pagination={pagination} onPageChange={handlePageChange} />
          </>
        )}
      </div>

      <div className="mt-16 mb-8 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Grow with EquipRent</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Join our platform and start earning today</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div
              onClick={() => navigate("/vendor-signup")}
              className="group relative overflow-hidden rounded-2xl cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
              <div className="p-8 text-white relative z-10">
                <div className="text-5xl mb-4">🏪</div>
                <h3 className="text-2xl font-bold mb-2">Become a Vendor</h3>
                <p className="text-white/80 text-sm leading-relaxed mb-4">List your equipment and earn passive income. Reach thousands of renters in your city.</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {["Zero upfront fee", "You set the price", "Weekly payouts"].map(tag => (
                    <span key={tag} className="text-xs bg-white/20 text-white px-3 py-1 rounded-full font-medium">{tag}</span>
                  ))}
                </div>
                <button className="bg-white text-purple-700 font-bold px-6 py-2.5 rounded-xl text-sm shadow hover:bg-purple-50 transition-colors">Start Selling →</button>
              </div>
            </div>

            <div
              onClick={() => navigate("/delivery-signup")}
              className="group relative overflow-hidden rounded-2xl cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              style={{ background: "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)" }}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
              <div className="p-8 text-gray-900 relative z-10">
                <div className="text-5xl mb-4">🚚</div>
                <h3 className="text-2xl font-bold mb-2">Become a Delivery Partner</h3>
                <p className="text-gray-800/80 text-sm leading-relaxed mb-4">Deliver equipment on your own schedule. Earn per delivery with flexible hours.</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {["Flexible timing", "Per-delivery pay", "No target pressure"].map(tag => (
                    <span key={tag} className="text-xs bg-black/10 text-gray-900 px-3 py-1 rounded-full font-medium">{tag}</span>
                  ))}
                </div>
                <button className="bg-gray-900 text-yellow-300 font-bold px-6 py-2.5 rounded-xl text-sm shadow hover:bg-gray-800 transition-colors">Start Delivering →</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}