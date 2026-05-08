import { useState, useContext } from "react";
import API from "../services/api";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";
export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateEmail = location.state?.email || "";

  const { login: authLogin } = useContext(AuthContext);

  const [data, setData] = useState({ email: stateEmail, otp: "" });

  const verify = async (e) => {
    if (e) e.preventDefault();
    try {
      const res = await API.post("/auth/verify-otp", data);
      toast.success("Verified ✅");
      authLogin(res.data.token, res.data.role);
      navigate("/dashboard");
    } catch {
      toast.error("Invalid OTP ❌");
    }
  };

  return (
    <div className="h-screen flex justify-center items-center bg-gradient-to-br from-indigo-600 to-purple-700">
      <div className="bg-white/20 backdrop-blur-lg p-8 rounded-2xl shadow-xl w-96 text-white text-center">
        <h2 className="text-3xl font-bold mb-2">Verify OTP</h2>
        <p className="mb-6 text-sm text-gray-200">Enter the OTP sent to your email</p>

        <form onSubmit={verify}>
          {!stateEmail && (
            <input
              type="email"
              placeholder="Email Address"
              aria-label="Email Address"
              className="w-full p-3 mb-4 rounded bg-white/30 outline-none placeholder-white/80 transition-all focus:bg-white/40"
              onChange={(e) => setData({ ...data, email: e.target.value })}
              value={data.email}
              required
            />
          )}

          <input
            type="text"
            placeholder="Enter OTP"
            aria-label="Enter OTP"
            className="w-full p-3 mb-6 rounded bg-white/30 outline-none placeholder-white/80 transition-all focus:bg-white/40 text-center tracking-widest text-lg"
            onChange={(e) => setData({ ...data, otp: e.target.value })}
            required
          />

          <button
            type="submit"
            className="w-full bg-black/70 hover:bg-black transition-colors p-3 rounded-lg font-semibold shadow-lg"
          >
            Verify & Login
          </button>
        </form>
      </div>
    </div>
  );
}