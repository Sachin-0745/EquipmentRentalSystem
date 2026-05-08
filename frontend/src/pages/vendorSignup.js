import { useState, useEffect } from "react";
import API from "../services/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function VendorSignup() {
  const [data, setData] = useState({
    name: "",
    email: "",
    mobile_no: "",
    password: "",
    confirmPassword: "",
    shop_name: "",
    address: "",
    city: "Jaipur"
  });
  const [document, setDocument] = useState(null);
  const [idProof, setIdProof] = useState(null);
  const [docError, setDocError] = useState("");
  const [idError, setIdError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("token");

  // Auto-restore / Pre-fill form data
  useEffect(() => {
    const saved = localStorage.getItem("vendor_signup_data");
    if (saved) {
      const parsed = JSON.parse(saved);
      setData(prev => ({ ...prev, ...parsed, password: "", confirmPassword: "" }));
    }

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

  // Auto-save form data
  useEffect(() => {
    const { password, confirmPassword, ...rest } = data;
    localStorage.setItem("vendor_signup_data", JSON.stringify(rest));
  }, [data]);

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

  const handleIdProofChange = (e) => {
    const file = e.target.files[0];
    setIdError("");
    if (!file) { setIdProof(null); return; }
    if (file.type !== "application/pdf") {
      setIdError("Only PDF files are allowed.");
      e.target.value = "";
      return;
    }
    if (file.size > 150 * 1024) {
      setIdError("ID Proof must be under 150 KB.");
      e.target.value = "";
      return;
    }
    setIdProof(file);
  };

  const submit = async (e) => {
    if (e) e.preventDefault();
    
    // NEW VALIDATION LOGIC
    const { name, email, mobile_no, shop_name, address } = data;
    if (!name.trim() || !email.trim() || !mobile_no.trim() || !shop_name.trim() || !address.trim()) {
      return toast.error("Form Error: Please fill in all required shop and contact details.");
    }

    if (!idProof) {
      return toast.error("Document Error: ID Proof (Aadhar/PAN/DL) is required.");
    }

    // Password only required for non-logged-in users
    if (!isLoggedIn) {
      if (!data.password || !data.confirmPassword) {
        return toast.error("Account Error: Password is required for new registration.");
      }
      if (data.password !== data.confirmPassword) {
        return toast.error("Account Error: Passwords do not match.");
      }
      if (data.password.length < 8 || data.password.length > 12) {
        return toast.error("Account Error: Password must be 8-12 characters.");
      }
    }

    if (docError || idError) return toast.error("Please fix document errors before submitting.");

    setLoading(true);
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if ((k === "password" || k === "confirmPassword") && !v) return;
        if (v) formData.append(k, v);
      });
      if (document) formData.append("document", document);
      if (idProof) formData.append("id_proof", idProof);

      await API.post("/auth/vendor-signup", formData, { headers: { "Content-Type": "multipart/form-data" } });
      localStorage.removeItem("vendor_signup_data");
      toast.success("Application successful! Verify the OTP sent to your email.");

      navigate("/verify", { state: { email: data.email.trim() } });
    } catch (error) {
      toast.error(error.response?.data?.message || "Application submission failed");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full p-3 rounded bg-white/20 outline-none placeholder-white/70 transition-all focus:bg-white/30 text-white";

  return (
    <div className="min-h-screen flex items-center justify-center py-10"
      style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}>

      <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-xl text-white border border-white/20">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🏪</div>
          <h2 className="text-3xl font-bold">Become a Vendor</h2>
          <p className="text-white/60 text-sm mt-1">Join EquipRent and start earning by leasing your equipment.</p>
          <p className="text-white/10 text-[8px] mt-2 tracking-widest">VER-3.1-DOCS</p>
        </div>

        <form onSubmit={submit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input className={inputCls} placeholder="Full Name" value={data.name}
              onChange={e => setData({ ...data, name: e.target.value })} required />
            <input type="email" className={inputCls} placeholder="Email Address" value={data.email}
              onChange={e => setData({ ...data, email: e.target.value })} required />
            <input className={inputCls} placeholder="Mobile Number" value={data.mobile_no}
              onChange={e => setData({ ...data, mobile_no: e.target.value })} required />
            <input className={inputCls} placeholder="Shop / Business Name" value={data.shop_name}
              onChange={e => setData({ ...data, shop_name: e.target.value })} required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <select className="w-full p-3 rounded bg-white/20 outline-none text-white transition-all focus:bg-white/30"
              value={data.city} onChange={e => setData({ ...data, city: e.target.value })} required>
              <option className="text-black" value="Jaipur">Jaipur</option>
              <option className="text-black" value="Ajmer">Ajmer</option>
            </select>
            <textarea className="w-full p-3 rounded bg-white/20 outline-none placeholder-white/70 transition-all focus:bg-white/30 resize-none h-12 text-white"
              placeholder="Full Business Address"
              value={data.address}
              onChange={e => setData({ ...data, address: e.target.value })} required />
          </div>

          {!isLoggedIn && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input type="password" className={inputCls} placeholder="Password (8-12 chars)"
                onChange={e => setData({ ...data, password: e.target.value })} required />
              <input type="password" className={inputCls} placeholder="Confirm Password"
                onChange={e => setData({ ...data, confirmPassword: e.target.value })} required />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                🪪 ID Proof <span className="text-white/40 font-normal">(Optional · PDF)</span>
              </label>
              <div className="relative">
                <input type="file" accept="application/pdf" id="vendor-id"
                  className="hidden" onChange={handleIdProofChange} />
                <label htmlFor="vendor-id"
                  className={`flex items-center gap-2 w-full p-2.5 rounded bg-white/10 border border-dashed ${idError ? 'border-red-400' : 'border-white/30'} hover:border-white/60 cursor-pointer transition-all`}>
                  <span className="text-sm">{idProof ? "✅" : "📎"}</span>
                  <span className="text-[11px] text-white/70 truncate">
                    {idProof ? idProof.name : "Upload ID Proof..."}
                  </span>
                </label>
              </div>
              {idError && <p className="text-red-400 text-[10px] mt-1">{idError}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/80 mb-1.5">
                📄 Business Doc <span className="text-white/40 font-normal">(Optional · PDF)</span>
              </label>
              <div className="relative">
                <input type="file" accept="application/pdf" id="vendor-doc"
                  className="hidden" onChange={handleDocChange} />
                <label htmlFor="vendor-doc"
                  className={`flex items-center gap-2 w-full p-2.5 rounded bg-white/10 border border-dashed ${docError ? 'border-red-400' : 'border-white/30'} hover:border-white/60 cursor-pointer transition-all`}>
                  <span className="text-sm">{document ? "✅" : "📎"}</span>
                  <span className="text-[11px] text-white/70 truncate">
                    {document ? document.name : "Upload Shop Doc..."}
                  </span>
                </label>
              </div>
              {docError && <p className="text-red-400 text-[10px] mt-1">{docError}</p>}
            </div>
          </div>
          
          <div className="bg-indigo-900/40 p-2.5 rounded-lg mb-6 border border-indigo-500/30">
            <p className="text-[10px] text-indigo-200 leading-tight">
              <strong>Note:</strong> Personal details on ID proof and business documents must match the applicant name exactly.
            </p>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black transition-all p-3 rounded-lg font-bold shadow-lg disabled:opacity-60">
            {loading ? "Submitting..." : "Submit Vendor Application"}
          </button>
        </form>

        <p className="mt-5 text-sm text-center text-white/60">
          Already have an account?{" "}
          <span className="underline cursor-pointer font-medium text-white hover:text-yellow-300"
            onClick={() => navigate("/")}>Login</span>
        </p>
      </div>
    </div>
  );
}
