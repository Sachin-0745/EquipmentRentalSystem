import { useState } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const sendOTP = async (e) => {
    if (e) e.preventDefault();
    if (!email) return toast.error("Enter email");

    try {
      await API.post("/auth/forgot-password", { email });
      toast.success("OTP sent to your email.");
      navigate("/reset", { state: { email } });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send OTP.");
    }
  };

  return (
    <div className="h-screen flex justify-center items-center bg-gradient-to-br from-indigo-600 to-purple-700">
      <div className="bg-white/20 backdrop-blur-lg p-8 rounded-2xl shadow-xl w-96 text-white text-center">
        <h2 className="text-3xl font-bold mb-2">Forgot Password</h2>
        <p className="mb-6 text-sm text-gray-200">Enter your registered email address</p>

        <form onSubmit={sendOTP}>
          <input
            type="email"
            aria-label="Email Address"
            placeholder="Email Address"
            className="w-full p-3 mb-6 rounded bg-white/30 outline-none placeholder-white/80 transition-all focus:bg-white/40"
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button
            type="submit"
            className="w-full bg-black/70 hover:bg-black transition-colors p-3 rounded-lg font-semibold shadow-lg"
          >
            Send OTP
          </button>
        </form>

        <p className="mt-4 text-sm">
          Remember your password?{" "}
          <span
            className="underline cursor-pointer font-medium hover:text-gray-200"
            onClick={() => navigate("/")}
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
}