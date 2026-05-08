import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import API from "../services/api";
import { AuthContext } from "../context/AuthContext";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, role, logout } = useContext(AuthContext);

  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem("theme") === "dark");

  useEffect(() => {
    if (token) fetchNotifications();
  }, [token, location.pathname]);

  // Handle Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const fetchNotifications = async () => {
    try {
      const res = await API.get("/notifications");
      setNotifications(res.data);
    } catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    try {
      await API.put("/notifications/read-all");
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
    } catch (err) { console.error(err); }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const hiddenRoutes = ["/", "/signup", "/vendor-signup", "/delivery-signup", "/verify", "/forgot", "/reset"];
  if (hiddenRoutes.includes(location.pathname) || !token) return null;

  const NavLinks = () => (
    <>
      <Link to="/dashboard" className="hover:text-yellow-400 transition">Shop</Link>
      <Link to="/cart" className="hover:text-yellow-400 transition">Cart</Link>
      <Link to="/rentals" className="hover:text-yellow-400 transition">My Rentals</Link>
      <Link to="/profile" className="hover:text-yellow-400 transition">Profile</Link>
      {role === "admin" && (
        <Link to="/admin" className="hover:text-yellow-400 transition font-semibold text-blue-300">Admin Panel</Link>
      )}
      {role === "vendor" && (
        <Link to="/vendor" className="hover:text-yellow-400 transition font-semibold text-indigo-300">Vendor Dashboard</Link>
      )}
      {role === "delivery_boy" && (
        <Link to="/delivery-dashboard" className="hover:text-yellow-400 transition font-semibold text-orange-400">Delivery Dashboard</Link>
      )}
    </>
  );

  return (
    <nav className="bg-gray-900 text-white p-4 shadow-md sticky top-0 z-50 transition-colors">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/dashboard" className="text-2xl font-bold text-yellow-400">
          EquipRent
        </Link>

        {/* Desktop Menu */}
        <div className="hidden lg:flex gap-6 items-center">
          <NavLinks />
          
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full hover:bg-gray-800 transition"
            title="Toggle Dark Mode"
          >
            {isDarkMode ? "☀️" : "🌙"}
          </button>

          <div className="relative">
            <button 
               onClick={() => setShowDropdown(!showDropdown)} 
               className="hover:text-yellow-400 transition flex items-center relative"
            >
               Notifications
               {unreadCount > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{unreadCount}</span>}
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden z-[100] border border-gray-100 dark:border-gray-700">
                <div className="bg-gray-50 dark:bg-gray-700 flex justify-between items-center p-3 border-b dark:border-gray-600">
                   <h3 className="text-gray-800 dark:text-white font-bold text-sm">Notifications</h3>
                   {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Mark all read</button>}
                </div>
                <div className="max-h-64 overflow-y-auto">
                   {notifications.length === 0 ? (
                      <p className="text-gray-500 text-xs p-4 text-center">No notifications yet.</p>
                   ) : (
                      notifications.map(n => (
                         <div key={n.id} className={`p-3 border-b dark:border-gray-700 text-sm ${!n.is_read ? 'bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-l-indigo-500' : 'bg-white dark:bg-gray-800 border-l-4 border-l-transparent'}`}>
                             <p className="text-gray-800 dark:text-gray-200">{n.message}</p>
                             <span className="text-[10px] text-gray-400 block mt-1">{new Date(n.created_at).toLocaleString()}</span>
                         </div>
                      ))
                   )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 px-4 py-1 rounded transition text-sm font-bold"
          >
            Logout
          </button>
        </div>

        {/* Mobile Buttons */}
        <div className="flex lg:hidden items-center gap-4">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="text-xl">
            {isDarkMode ? "☀️" : "🌙"}
          </button>
          <button 
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="text-2xl focus:outline-none"
          >
            {showMobileMenu ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {showMobileMenu && (
        <div className="lg:hidden mt-4 pb-4 border-t border-gray-800 flex flex-col gap-4">
          <div className="flex flex-col gap-3 p-2">
            <NavLinks />
            <button 
              onClick={() => { setShowDropdown(!showDropdown); setShowMobileMenu(false); }}
              className="hover:text-yellow-400 transition text-left"
            >
              Notifications ({unreadCount})
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded transition text-sm font-bold text-center"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

