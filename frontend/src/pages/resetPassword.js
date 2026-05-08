import { useState } from "react";
import API from "../services/api";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const stateEmail = location.state?.email || "";

  const [data, setData] = useState({
    email: stateEmail,
    otp: "",
    newPassword: "",
    confirmPassword: ""
  });

  const reset = async (e) => {
    if (e) e.preventDefault();
    if (!data.email) return toast.error("Email missing. Please restart forgot password process.");

    if (data.newPassword !== data.confirmPassword) return toast.error("Passwords do not match");

    if (data.newPassword.length < 8 || data.newPassword.length > 12)
      return toast.error("Password must be 8-12 characters long");

    try {
      await API.post("/auth/reset-password", data);
      toast.success("Password reset successful. You can log in now.");
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password.");
    }
  };

  return (
    <div className="h-screen flex justify-center items-center bg-gradient-to-br from-indigo-600 to-purple-700">
      <div className="bg-white/20 backdrop-blur-lg p-8 rounded-2xl shadow-xl w-96 text-white text-center">
        <h2 className="text-3xl font-bold mb-2">Reset Password</h2>
        <p className="mb-6 text-sm text-gray-200">Enter your OTP and new password</p>

        <form onSubmit={reset}>
          <input aria-label="Enter OTP" className="w-full p-3 mb-4 rounded bg-white/30 outline-none placeholder-white/80 transition-all focus:bg-white/40" placeholder="Enter OTP"
            onChange={e=>setData({...data,otp:e.target.value})} required />

          <input aria-label="New Password" type="password" className="w-full p-3 mb-4 rounded bg-white/30 outline-none placeholder-white/80 transition-all focus:bg-white/40" placeholder="New Password"
            onChange={e=>setData({...data,newPassword:e.target.value})} required />

          <input aria-label="Confirm Password" type="password" className="w-full p-3 mb-6 rounded bg-white/30 outline-none placeholder-white/80 transition-all focus:bg-white/40" placeholder="Confirm Password"
            onChange={e=>setData({...data,confirmPassword:e.target.value})} required />

          <button type="submit"
            className="w-full bg-black/70 hover:bg-black transition-colors p-3 rounded-lg font-semibold shadow-lg">
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}