import { useState } from "react";
import API from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";

export default function Signup() {
  const [data, setData] = useState({
    name: "",
    email: "",
    mobile_no: "",
    password: "",
    confirmPassword: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const submit = async (e) => {
    e?.preventDefault();
    if (!data.name || !data.email || !data.mobile_no || !data.password || !data.confirmPassword)
      return toast.error("All fields required");

    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!nameRegex.test(data.name.trim())) return toast.error("Name must not contain numbers or special characters");

    const mobileRegex = /^[5-9]\d{9}$/;
    if (!mobileRegex.test(data.mobile_no.trim())) return toast.error("Mobile number must be 10 digits and start with 5, 6, 7, 8, or 9");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) return toast.error("Invalid email address");

    if (data.password !== data.confirmPassword) return toast.error("Passwords do not match");

    if (data.password.length < 8 || data.password.length > 12)
      return toast.error("Password must be 8-12 characters long");

    setIsLoading(true);
    try {
      await API.post("/auth/signup", data);
      toast.success("Registration initiated! OTP sent to your email.");
      navigate("/verify", { state: { email: data.email.trim() } });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to sign up");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-6 transition-colors">
      <div className="max-w-md w-full bg-white/10 dark:bg-black/30 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-white/5">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-black text-white tracking-tighter mb-1">Create <span className="text-yellow-400">Account</span></h1>
          <p className="text-blue-100 dark:text-gray-400 text-sm">Join the largest rental community</p>
        </div>
        
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-white dark:text-gray-300 text-xs font-bold mb-1 ml-1 uppercase">Full Name</label>
              <input 
                className="w-full bg-white/20 dark:bg-gray-800/50 border border-white/30 dark:border-gray-700 p-3 rounded-xl text-white placeholder-blue-200 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition text-sm"
                placeholder="John Doe"
                value={data.name}
                onChange={e => setData({...data, name: e.target.value})}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-white dark:text-gray-300 text-xs font-bold mb-1 ml-1 uppercase">Email</label>
                <input 
                  type="email" 
                  className="w-full bg-white/20 dark:bg-gray-800/50 border border-white/30 dark:border-gray-700 p-3 rounded-xl text-white placeholder-blue-200 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition text-sm"
                  placeholder="name@email.com"
                  value={data.email}
                  onChange={e => setData({...data, email: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-white dark:text-gray-300 text-xs font-bold mb-1 ml-1 uppercase">Mobile</label>
                <input 
                  type="tel" 
                  className="w-full bg-white/20 dark:bg-gray-800/50 border border-white/30 dark:border-gray-700 p-3 rounded-xl text-white placeholder-blue-200 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition text-sm"
                  placeholder="9876543210"
                  value={data.mobile_no}
                  onChange={e => setData({...data, mobile_no: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-white dark:text-gray-300 text-xs font-bold mb-1 ml-1 uppercase">Password</label>
                <input 
                  type="password" 
                  className="w-full bg-white/20 dark:bg-gray-800/50 border border-white/30 dark:border-gray-700 p-3 rounded-xl text-white placeholder-blue-200 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition text-sm"
                  placeholder="••••••••"
                  value={data.password}
                  onChange={e => setData({...data, password: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-white dark:text-gray-300 text-xs font-bold mb-1 ml-1 uppercase">Confirm</label>
                <input 
                  type="password" 
                  className="w-full bg-white/20 dark:bg-gray-800/50 border border-white/30 dark:border-gray-700 p-3 rounded-xl text-white placeholder-blue-200 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition text-sm"
                  placeholder="••••••••"
                  value={data.confirmPassword}
                  onChange={e => setData({...data, confirmPassword: e.target.value})}
                  required
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-black py-4 rounded-2xl shadow-lg transform hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider mt-4"
          >
            {isLoading ? "Processing..." : "Create My Account"}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-blue-100 dark:text-gray-400 text-xs">
            Already have an account? 
            <Link to="/" className="text-yellow-400 font-bold ml-1 hover:underline">Login here</Link>
          </p>
          <div className="flex justify-center gap-4 pt-2">
             <Link to="/vendor-signup" className="text-[10px] text-yellow-300 font-bold hover:text-white uppercase tracking-tighter">Become a Vendor</Link>
             <span className="text-white/30">|</span>
             <Link to="/delivery-signup" className="text-[10px] text-orange-300 font-bold hover:text-white uppercase tracking-tighter">Join Delivery Team</Link>
          </div>
        </div>
      </div>
    </div>
  );
}