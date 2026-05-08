import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

export default function DeliverySignup() {
  const [data, setData] = useState({
    name: "",
    email: "",
    mobile_no: "",
    password: "",
    confirmPassword: "",
    city: "Jaipur",
    vehicle_details: ""
  });
  const [document, setDocument] = useState(null);
  const [docError, setDocError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("token");

  // Pre-fill if logged-in user navigates here
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      API.get("/auth/me").then(res => {
        const u = res.data.data;
        setData(prev => ({
          ...prev,
          name: u.name || "",
          email: u.email || "",
          mobile_no: u.mobile_no || "",
        }));
      }).catch(() => {});
    }
  }, []);

  const handleDocChange = (e) => {
    const file = e.target.files[0];
    setDocError("");
    if (!file) { setDocument(null); return; }
    if (file.type !== "application/pdf") {
      setDocError("Only PDF files are allowed.");
      e.target.value = "";
      return;
    }
    if (file.size > 150 * 1024) {
      setDocError("Document must be under 150 KB.");
      e.target.value = "";
      return;
    }
    setDocument(file);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    
    // NEW VALIDATION LOGIC
    const { name, email, mobile_no, city, vehicle_details } = data;
    if (!name.trim() || !email.trim() || !mobile_no.trim() || !city.trim() || !vehicle_details.trim()) {
      return toast.error("Form Error: Basic driver details (Name, Email, Phone, City, Vehicle) are required");
    }

    if (!isLoggedIn) {
      if (!data.password || !data.confirmPassword) {
        return toast.error("Account Error: Password is required for new drivers.");
      }
      if (data.password !== data.confirmPassword) {
        return toast.error("Account Error: Passwords do not match.");
      }
      if (data.password.length < 8 || data.password.length > 12) {
        return toast.error("Account Error: Password must be 8-12 characters.");
      }
    }

    if (docError) return toast.error(docError);

    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if ((k === "password" || k === "confirmPassword") && !v) return;
        if (v) formData.append(k, v);
      });
      if (document) formData.append("document", document);

      const res = await API.post("/auth/delivery-signup", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success(res.data.message);
      if (res.data.requiresOTP) {
        navigate("/verify", { state: { email: data.email, role: "delivery_boy" } });
      } else {
        navigate("/login");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Application failed");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full p-3 mb-4 rounded bg-white/20 text-white outline-none placeholder-white/70 transition-all focus:bg-white/30";

  return (
    <div className="flex items-center justify-center min-h-screen py-10"
      style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}>

      <div className="bg-white/10 backdrop-blur-lg p-10 rounded-2xl shadow-2xl w-full max-w-md border border-white/20 text-white">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🚚</div>
          <h2 className="text-3xl font-extrabold tracking-wide">Drive With Us</h2>
          <p className="text-white/60 text-sm mt-1">Join our delivery fleet and earn on your schedule.</p>
          <p className="text-white/10 text-[8px] mt-2 tracking-widest">VER-3.0-LATEST</p>
        </div>

        <form onSubmit={handleSignup}>
          <input className={inputCls} placeholder="Full Name" value={data.name}
            onChange={e => setData({ ...data, name: e.target.value })} required />
          <input type="email" className={inputCls} placeholder="Email Address" value={data.email}
            onChange={e => setData({ ...data, email: e.target.value })} required />
          <input type="tel" className={inputCls} placeholder="Mobile Number" value={data.mobile_no}
            onChange={e => setData({ ...data, mobile_no: e.target.value })} required />

          <div className="grid grid-cols-2 gap-4 mb-4">
            <select className="w-full p-3 rounded bg-white/20 outline-none text-white transition-all focus:bg-white/30"
              value={data.city} onChange={e => setData({ ...data, city: e.target.value })} required>
              <option className="text-black" value="Jaipur">Jaipur</option>
              <option className="text-black" value="Ajmer">Ajmer</option>
            </select>
            <input className="w-full p-3 rounded bg-white/20 text-white outline-none placeholder-white/70 focus:bg-white/30"
              placeholder="Vehicle Model" value={data.vehicle_details} onChange={e => setData({ ...data, vehicle_details: e.target.value })} required />
          </div>

          {!isLoggedIn && (
            <>
              <input type="password" className={inputCls} placeholder="Password (8-12 chars)"
                onChange={e => setData({ ...data, password: e.target.value })} required />
              <input type="password" className={inputCls} placeholder="Confirm Password"
                onChange={e => setData({ ...data, confirmPassword: e.target.value })} required />
            </>
          )}

          <div className="mb-6">
            <label className="block text-sm font-semibold text-white/80 mb-2">
              📄 Driving License <span className="text-white/40 font-normal">(Optional · PDF · 150 KB)</span>
            </label>
            <input type="file" accept="application/pdf" id="delivery-doc"
              className="hidden" onChange={handleDocChange} />
            <label htmlFor="delivery-doc"
              className="flex items-center gap-3 w-full p-3 rounded bg-white/10 border border-dashed border-white/30 hover:border-white/60 cursor-pointer transition-all">
              <span className="text-xl">🪪</span>
              <span className="text-sm text-white/70">
                {document ? document.name : "Upload License PDF (Optional)..."}
              </span>
            </label>
            {docError && <p className="text-red-400 text-[10px] mt-1">{docError}</p>}
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-white text-indigo-700 font-bold p-3 rounded-lg hover:bg-indigo-50 transition-colors shadow-lg disabled:opacity-60">
            {loading ? "Submitting..." : "Submit Application"}
          </button>
        </form>

        <p className="mt-6 text-center text-white/60 text-sm">
          Already a driver? <Link to="/" className="text-white font-bold hover:underline">Login here</Link>
        </p>
      </div>
    </div>
  );
}
