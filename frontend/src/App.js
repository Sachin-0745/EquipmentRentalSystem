import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import { useEffect, Suspense, lazy } from "react";
import { Toaster } from "react-hot-toast";

// ── Eagerly loaded (tiny, always needed) ─────────────────────────────────────
import Navbar from "./components/Navbar";
import ErrorBoundary from "./components/ErrorBoundary";

// ── Lazy-loaded pages (code-split per route) ─────────────────────────────────
// Each import() creates a separate JS chunk loaded only when the route is visited
const Login             = lazy(() => import("./pages/login"));
const Signup            = lazy(() => import("./pages/signup"));
const VendorSignup      = lazy(() => import("./pages/vendorSignup"));
const DeliverySignup    = lazy(() => import("./pages/deliverySignup"));
const DeliveryDashboard = lazy(() => import("./pages/deliveryDashboard"));
const VerifyOTP         = lazy(() => import("./pages/verifyOTP"));
const Dashboard         = lazy(() => import("./pages/dashboard"));
const AdminPanel        = lazy(() => import("./pages/adminPanel"));
const VendorDashboard   = lazy(() => import("./pages/vendorDashboard"));
const ForgotPassword    = lazy(() => import("./pages/forgetPassword"));
const ResetPassword     = lazy(() => import("./pages/resetPassword"));
const Cart              = lazy(() => import("./pages/cart"));
const RentalHistory     = lazy(() => import("./pages/rentalHistory"));
const ProductDetails    = lazy(() => import("./pages/productDetails"));
const Profile           = lazy(() => import("./pages/profile"));

// ── Full-screen loading fallback ──────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center", background: "#f9fafb",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 48, height: 48, border: "4px solid #e5e7eb",
          borderTopColor: "#6366f1", borderRadius: "50%",
          animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
        }} />
        <p style={{ color: "#6b7280", fontSize: 14, fontWeight: 500 }}>Loading…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/**
 * PageBoundary — per-route Error Boundary wrapper.
 *
 * Uses the current pathname as the ErrorBoundary resetKey so that navigating
 * away from a crashed page automatically resets the boundary — the user never
 * gets permanently stuck on an error screen in another route.
 *
 * Only the content area of the crashing route shows the error UI.
 * The Navbar, Toaster, and all other routes remain fully functional.
 */
function PageBoundary({ children, pageName }) {
  const location = useLocation();
  return (
    <ErrorBoundary pageName={pageName} resetKey={location.pathname}>
      {children}
    </ErrorBoundary>
  );
}

// ── Route table — each entry defines a page with its boundary label ──────────
// Keeping this as data makes it trivial to add new routes without forgetting
// to wrap them in an ErrorBoundary.
function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public / Auth ─────────────────────────────────────────────── */}
        <Route path="/" element={
          <PageBoundary pageName="Login">
            <PublicRoute><Login /></PublicRoute>
          </PageBoundary>
        } />
        <Route path="/login" element={
          <PageBoundary pageName="Login">
            <PublicRoute><Login /></PublicRoute>
          </PageBoundary>
        } />
        <Route path="/signup" element={
          <PageBoundary pageName="Sign Up">
            <PublicRoute><Signup /></PublicRoute>
          </PageBoundary>
        } />
        <Route path="/forgot" element={
          <PageBoundary pageName="Forgot Password">
            <PublicRoute><ForgotPassword /></PublicRoute>
          </PageBoundary>
        } />
        <Route path="/reset" element={
          <PageBoundary pageName="Reset Password">
            <PublicRoute><ResetPassword /></PublicRoute>
          </PageBoundary>
        } />
        <Route path="/verify" element={
          <PageBoundary pageName="OTP Verification">
            <VerifyOTP />
          </PageBoundary>
        } />

        {/* ── Registration ──────────────────────────────────────────────── */}
        <Route path="/vendor-signup" element={
          <PageBoundary pageName="Vendor Registration">
            <VendorSignup />
          </PageBoundary>
        } />
        <Route path="/delivery-signup" element={
          <PageBoundary pageName="Delivery Partner Registration">
            <DeliverySignup />
          </PageBoundary>
        } />

        {/* ── User pages ────────────────────────────────────────────────── */}
        <Route path="/dashboard" element={
          <PageBoundary pageName="Dashboard">
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          </PageBoundary>
        } />
        <Route path="/cart" element={
          <PageBoundary pageName="Cart">
            <ProtectedRoute><Cart /></ProtectedRoute>
          </PageBoundary>
        } />
        <Route path="/rentals" element={
          <PageBoundary pageName="Rental History">
            <ProtectedRoute><RentalHistory /></ProtectedRoute>
          </PageBoundary>
        } />
        <Route path="/equipment/:id" element={
          <PageBoundary pageName="Product Details">
            <ProtectedRoute><ProductDetails /></ProtectedRoute>
          </PageBoundary>
        } />
        <Route path="/profile" element={
          <PageBoundary pageName="Profile">
            <ProtectedRoute><Profile /></ProtectedRoute>
          </PageBoundary>
        } />

        {/* ── Role-specific dashboards ───────────────────────────────────── */}
        <Route path="/admin" element={
          <PageBoundary pageName="Admin Panel">
            <ProtectedRoute allowedRoles={["admin"]}><AdminPanel /></ProtectedRoute>
          </PageBoundary>
        } />
        <Route path="/vendor" element={
          <PageBoundary pageName="Vendor Dashboard">
            <ProtectedRoute allowedRoles={["vendor"]}><VendorDashboard /></ProtectedRoute>
          </PageBoundary>
        } />
        <Route path="/delivery-dashboard" element={
          <PageBoundary pageName="Delivery Dashboard">
            <ProtectedRoute allowedRoles={["delivery_boy"]}><DeliveryDashboard /></ProtectedRoute>
          </PageBoundary>
        } />
      </Routes>
    </Suspense>
  );
}

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return (
    // Outer boundary: last-resort catch for catastrophic provider/context crashes.
    // Per-route boundaries (PageBoundary) handle all normal page-level failures.
    <ErrorBoundary pageName="Application">
      <AuthProvider>
        <SocketProvider>
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
          <BrowserRouter>
            <Navbar />
            <AppRoutes />
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;