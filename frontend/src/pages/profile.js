import { useEffect, useState } from "react";
import API from "../services/api";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", mobile_no: "", address: "", city: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const CITIES = ["Jaipur", "Ajmer"];

  const fetchProfile = async () => {
    try {
      const res = await API.get("/user/profile");
      // Handle both { data: {...} } and raw object (backward compat)
      const profile = res.data?.data || res.data;
      setUser(profile);
      setEditForm({
        name:      profile.name      || "",
        mobile_no: profile.mobile_no || "",
        address:   profile.address   || "",
        city:      profile.city      || "Jaipur",
      });
    } catch (err) {
      console.error(err);
      setError("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");

    // Client-side validation
    if (editForm.name && !/^[a-zA-Z\s]+$/.test(editForm.name))
      return setError("Name must only contain letters.");
    if (editForm.mobile_no && !/^[5-9]\d{9}$/.test(editForm.mobile_no))
      return setError("Mobile number must be 10 digits starting with 5–9.");

    setSaving(true);
    try {
      const res = await API.put("/user/profile", editForm);
      setSuccess(res.data?.message || "Profile updated successfully!");
      setIsEditing(false);
      fetchProfile();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || "Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500 font-semibold">Loading Profile...</p>
      </div>
    </div>
  );

  if (!user) return <div className="p-10 text-center text-red-500 font-bold">{error || "Profile not found."}</div>;

  const roleColors = { admin: "bg-purple-100 text-purple-700", vendor: "bg-blue-100 text-blue-700", delivery_boy: "bg-orange-100 text-orange-700", user: "bg-green-100 text-green-700" };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-gray-950 dark:to-indigo-950 flex justify-center py-12 px-4 transition-colors">
      <div className="max-w-2xl w-full">

        {/* Header Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 mb-6 transition-colors">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-black shadow-lg">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">{user.name}</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase ${roleColors[user.role] || 'bg-gray-100 text-gray-700'}`}>
                  {user.role?.replace('_', ' ')}
                </span>
                {user.city && <span className="px-3 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs font-semibold">📍 {user.city}</span>}
              </div>
            </div>
            {!isEditing && (
              <button
                onClick={() => { setIsEditing(true); setError(""); setSuccess(""); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-5 rounded-xl transition text-sm"
              >✏️ Edit</button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error   && <div className="mb-4 text-red-700 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 rounded-xl font-semibold text-sm">{error}</div>}
        {success && <div className="mb-4 text-green-700 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-3 rounded-xl font-semibold text-sm">✅ {success}</div>}

        {/* Info / Edit Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 transition-colors">
          {!isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: "Full Name",  value: user.name },
                { label: "Email",      value: user.email, note: "Cannot be changed" },
                { label: "Mobile No",  value: user.mobile_no || "Not provided" },
                { label: "City",       value: user.city      || "Not set" },
                { label: "Address",    value: user.address   || "No address saved", full: true },
              ].map(f => (
                <div key={f.label} className={f.full ? "md:col-span-2" : ""}>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
                    {f.label} {f.note && <span className="normal-case font-normal text-gray-400">({f.note})</span>}
                  </label>
                  <p className="text-base font-semibold text-gray-800 dark:text-gray-200">{f.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-5">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Edit Profile</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Full Name</label>
                  <input type="text"
                    className="w-full border-2 dark:border-gray-700 p-3 rounded-xl focus:border-indigo-500 outline-none transition text-sm bg-white dark:bg-gray-800 dark:text-white"
                    placeholder="Your full name"
                    value={editForm.name}
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Email (locked)</label>
                  <input type="text" disabled
                    className="w-full border-2 dark:border-gray-700 p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed text-sm"
                    value={user.email}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Mobile Number</label>
                  <input type="tel" maxLength={10}
                    className="w-full border-2 dark:border-gray-700 p-3 rounded-xl focus:border-indigo-500 outline-none transition text-sm bg-white dark:bg-gray-800 dark:text-white"
                    placeholder="10-digit mobile number"
                    value={editForm.mobile_no}
                    onChange={e => setEditForm({...editForm, mobile_no: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">City</label>
                  <select
                    className="w-full border-2 dark:border-gray-700 p-3 rounded-xl focus:border-indigo-500 outline-none transition text-sm bg-white dark:bg-gray-800 dark:text-white"
                    value={editForm.city}
                    onChange={e => setEditForm({...editForm, city: e.target.value})}
                  >
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Delivery Address</label>
                  <textarea rows={3}
                    className="w-full border-2 dark:border-gray-700 p-3 rounded-xl focus:border-indigo-500 outline-none transition text-sm resize-none bg-white dark:bg-gray-800 dark:text-white"
                    placeholder="House no., Street, Area..."
                    value={editForm.address}
                    onChange={e => setEditForm({...editForm, address: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t dark:border-gray-800">
                <button type="submit" disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-3 px-8 rounded-xl shadow transition"
                >{saving ? "Saving..." : "Save Changes"}</button>
                <button type="button" onClick={() => { setIsEditing(false); setError(""); }}
                  className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3 px-8 rounded-xl transition"
                >Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
