import { useState, useContext } from "react";
import API from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function Login() {
  const [data, setData] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login: authLogin } = useContext(AuthContext);

  const login = async (e) => {
    e?.preventDefault();
    if (!data.email || !data.password) {
      return toast.error("Please fill in both email and password");
    }
    setIsLoading(true);
    try {
      const res = await API.post("/auth/login", data);
      authLogin(res.data.token, res.data.role);
      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-6 transition-colors">
      <div className="max-w-md w-full bg-white/10 dark:bg-black/30 backdrop-blur-lg rounded-3xl p-10 shadow-2xl border border-white/20 dark:border-white/5">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-white tracking-tighter mb-2">Equip<span className="text-yellow-400">Rent</span></h1>
          <p className="text-blue-100 dark:text-gray-400 font-medium">Welcome back! Please login to your account</p>
        </div>
        
        <form onSubmit={login} className="space-y-6">
          <div>
            <label className="block text-white dark:text-gray-300 text-sm font-bold mb-2 ml-1">Email Address</label>
            <input 
              type="email" 
              className="w-full bg-white/20 dark:bg-gray-800/50 border border-white/30 dark:border-gray-700 p-4 rounded-2xl text-white placeholder-blue-200 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
              placeholder="name@example.com"
              value={data.email}
              onChange={(e) => setData({ ...data, email: e.target.value })}
              required
            />
          </div>
          
          <div>
            <label className="block text-white dark:text-gray-300 text-sm font-bold mb-2 ml-1">Password</label>
            <input 
              type="password" 
              className="w-full bg-white/20 dark:bg-gray-800/50 border border-white/30 dark:border-gray-700 p-4 rounded-2xl text-white placeholder-blue-200 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition"
              placeholder="••••••••"
              value={data.password}
              onChange={(e) => setData({ ...data, password: e.target.value })}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-black py-4 rounded-2xl shadow-lg transform hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
          >
            {isLoading ? "Logging in..." : "Login Now"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-blue-100 dark:text-gray-400 text-sm">
            Don't have an account? 
            <Link to="/signup" className="text-yellow-400 font-bold ml-1 hover:underline">Sign up for free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}