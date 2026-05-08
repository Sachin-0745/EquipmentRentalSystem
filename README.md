# EquipRent — Online Equipment Rental System

> A full-stack web application where customers can browse and rent equipment from verified vendors. Vendors manage their own listings and orders. Delivery partners handle home deliveries and return pickups. Admins oversee everything — users, equipment, orders, and driver approvals.

---

## 1. Project Description

EquipRent is a web-based equipment rental platform built as a Software Engineering Lab project. It moves the traditional equipment rental process — which usually involved phone calls and physical visits — onto a single digital interface.

A customer registers, browses equipment by city and category, selects rental dates, adds items to a cart, and pays online or via Cash on Delivery. They can choose between self-pickup from the vendor's location or home delivery by an assigned driver. The vendor approves orders, manages their equipment, and tracks earnings. A delivery partner gets assigned to orders and handles both the delivery to the customer and the return pickup when the rental period ends. The admin manages the entire platform.

The system has **four user roles**: Customer, Vendor, Delivery Boy, and Admin.

---

## 2. Features

### Customer
- OTP-based email registration with JWT login
- Browse equipment filtered by city, category, and keyword
- Advanced search with price range and date-based availability filters
- View equipment detail pages with average customer ratings and reviews
- Add equipment to cart with rental start and end dates
- Availability check before checkout — prevents double-booking
- Checkout with **COD** or **Razorpay (test mode)** online payment
- Choose between **self-pickup** or **home delivery** (₹50 delivery charge)
- View rental history and track order status in real time
- See assigned delivery boy name and phone number on tracked orders
- Cancel a pending or active order
- Submit a return request — choose self-return or driver pickup
- Submit ratings and reviews on completed rentals
- Update profile (name, mobile, city, address)
- Forgot password / reset password via OTP email

### Vendor
- Apply to become a vendor by uploading business documents for admin review
- Add, update, and delete own equipment listings
- Newly added equipment goes live only after admin approval
- Submit update requests for approved equipment (requires admin review)
- View and manage incoming rental orders from customers
- Approve or reject rental requests
- Confirm return requests from customers
- View earnings from completed orders
- Bulk import up to 200 equipment items at once via JSON

### Delivery Boy
- Apply as a delivery partner by submitting name, city, vehicle, and driving license (PDF)
- **Verification:** Existing users submit directly; new users require OTP verification first
- Final approval is handled by the admin
- After approval, gets a dedicated delivery dashboard
- View orders assigned to them with due date status (today / upcoming / overdue)
- Accept or skip an assigned delivery
- Update delivery status step by step: Picked Up → Out for Delivery → Delivered
- Handle return pickups when a customer requests a driver to collect their equipment
- Mark return pickups as collected and track them through to completion
- Reveal customer contact information on the order card
- View Google Maps link for delivery/pickup address
- COD collections are flagged clearly with the amount to collect
- View full delivery history — both initial deliveries and return pickups are tracked separately
- View total earnings (₹30 per completed task — delivery or return pickup)

### Admin
- Manage all users — view list, delete accounts
- Review and approve or reject vendor applications
- Review and approve or reject delivery boy applications
- View submitted documents for drivers and vendors
- Approve or reject equipment listings from vendors
- Add, edit, and delete equipment directly without going through vendor
- Manage equipment categories (create, update, delete)
- View all rental orders across the platform
- Assign a delivery boy to any approved delivery-type order (auto-selects by city)
- Update order status for admin-listed equipment
- Review and process vendor equipment update requests
- View all return requests with delivery boy info

### System
- JWT access tokens (15-min expiry) + HTTP-only refresh tokens (7-day expiry)
- Token blacklisting on logout
- Input validation on all endpoints (express-validator)
- Equipment image uploads via Cloudinary (or local disk fallback)
- OTP emails sent via Nodemailer (Gmail)
- In-memory response caching for equipment listing endpoints
- Delivery boy auto-assignment by city with skip/failover logic
- Dual delivery history tracking — initial deliveries and return pickups tracked separately
- Per-route error boundaries in React — one broken page doesn't crash the rest
- Dark mode support across all pages

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose ODM) |
| Frontend | React.js |
| Authentication | JWT + bcrypt |
| Real-time | Socket.io |
| Email | Nodemailer (Gmail) |
| Payment | Razorpay API (test mode) |
| Image Storage | Cloudinary / Local disk fallback |
| Validation | express-validator |

---

## 4. Project Structure

```
EquipRent/
├── server/                         # Node.js backend
│   ├── controllers/
│   │   ├── authController.js       # Signup, OTP, login, logout, forgot/reset password
│   │   ├── equipmentController.js  # Browse, search, availability, bulk upload
│   │   ├── cartController.js       # Add, update, remove cart items
│   │   ├── rentalController.js     # Checkout, cancel, return requests, switch to pickup
│   │   ├── deliveryController.js   # Delivery boy orders, status updates, history, earnings
│   │   ├── vendorController.js     # Vendor dashboard, orders, earnings, update requests
│   │   ├── adminController.js      # Full platform management including delivery approvals
│   │   ├── paymentController.js    # Razorpay webhook handling
│   │   ├── reviewController.js     # Customer reviews and ratings
│   │   ├── notificationController.js
│   │   └── returnController.js
│   ├── models/
│   │   ├── User.js                 # Roles: user, vendor, admin, delivery_boy
│   │   ├── Equipment.js            # Listings with embedded reviews
│   │   ├── Rental.js               # Orders with delivery fields and skip tracking
│   │   ├── Cart.js
│   │   ├── OTP.js
│   │   ├── Notification.js
│   │   ├── Category.js
│   │   ├── TokenBlacklist.js
│   │   └── VendorUpdateRequest.js
│   ├── routes/
│   │   ├── auth.js                 # /api/auth/*
│   │   ├── equipment.js            # /api/equipment/*
│   │   ├── cart.js                 # /api/cart/*
│   │   ├── rental.js               # /api/rental/*
│   │   ├── delivery.js             # /api/delivery/*
│   │   ├── vendor.js               # /api/vendor/*
│   │   ├── admin.js                # /api/admin/*
│   │   ├── review.js
│   │   └── notification.js
│   ├── middlewares/
│   │   ├── auth.js                 # JWT verification, isAdmin, isVendor, isDeliveryBoy guards
│   │   ├── validate.js
│   │   ├── cache.js
│   │   ├── rateLimiter.js
│   │   ├── sanitize.js
│   │   └── errorHandler.js
│   ├── utils/
│   │   ├── sendMail.js
│   │   ├── logger.js
│   │   ├── socket.js               # Socket.io real-time notifications
│   │   ├── asyncHandler.js
│   │   ├── reliability.js
│   │   └── pagination.js
│   └── server.js
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── dashboard.js
        │   ├── productDetails.js
        │   ├── cart.js
        │   ├── rentalHistory.js
        │   ├── profile.js
        │   ├── adminPanel.js
        │   ├── vendorDashboard.js
        │   ├── deliveryDashboard.js    # Delivery boy workspace
        │   ├── deliverySignup.js       # Delivery partner registration
        │   ├── vendorSignup.js
        │   ├── signup.js / login.js / verifyOTP.js
        │   └── forgetPassword.js / resetPassword.js
        ├── components/
        │   ├── Navbar.js
        │   ├── Admin/
        │   │   ├── DeliveryVerifier.js # Admin approves/rejects delivery boy applications
        │   │   ├── VendorVerifier.js
        │   │   ├── OrderManager.js
        │   │   ├── EquipmentForm.js
        │   │   └── ReturnVerifier.js
        │   ├── EmptyState.js
        │   ├── ErrorBoundary.js
        │   └── Skeleton.js
        ├── services/api.js             # Axios with token refresh interceptor
        ├── context/
        │   ├── AuthContext.js
        │   └── SocketContext.js
        └── hooks/
```

---

## 5. Installation & Setup

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- A Razorpay account (test keys)
- A Gmail account with App Password enabled
- A Cloudinary account (optional — falls back to local disk)

### Step 1 — Clone the repository
```bash
git clone https://github.com/Sachin-0745/EquipmentRentalSystem
cd EquipRent
```

### Step 2 — Set up environment variables

Create a `.env` file inside the `/server` folder:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/equiprent

JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here

EMAIL=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password

RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

FRONTEND_URL=http://localhost:3000
```

> If Cloudinary variables are not set, uploads fall back to the local `uploads/` folder.

### Step 3 — Run the Backend
```bash
cd server
npm install
npm run dev
```
Server runs on `http://localhost:5000`

### Step 4 — Run the Frontend
Open a second terminal:
```bash
cd frontend
npm install
npm start
```
Frontend runs on `http://localhost:3000`

---

## 6. API Endpoints

### Authentication — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | No | Register new customer (sends OTP) |
| POST | `/api/auth/verify-otp` | No | Verify OTP and create account |
| POST | `/api/auth/login` | No | Login and receive JWT |
| POST | `/api/auth/logout` | JWT | Logout and blacklist token |
| POST | `/api/auth/refresh-token` | Cookie | Get new access token |
| POST | `/api/auth/forgot-password` | No | Send OTP for password reset |
| POST | `/api/auth/reset-password` | No | Reset password using OTP |
| GET | `/api/auth/me` | JWT | Get logged-in user profile |
| PUT | `/api/auth/me` | JWT | Update user profile |
| POST | `/api/auth/vendor-signup` | No | Apply as vendor (with document upload) |
| POST | `/api/auth/delivery-signup` | No | Apply as delivery partner (with license upload) |

### Equipment — `/api/equipment`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/equipment` | No | List approved equipment (paginated, filterable) |
| GET | `/api/equipment/search` | No | Advanced search — text, price range, date availability |
| GET | `/api/equipment/:id` | No | Get single equipment with avg rating |
| GET | `/api/equipment/:id/availability` | No | Check available stock for a date range |
| GET | `/api/equipment/:id/booked-dates` | No | Get fully booked dates (next 90 days) |
| POST | `/api/equipment/bulk-upload` | Vendor | Bulk import up to 200 equipment items |

### Cart — `/api/cart`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/cart` | JWT | Get user's cart |
| POST | `/api/cart` | JWT | Add item with rental dates |
| PUT | `/api/cart/:id` | JWT | Update cart item quantity |
| DELETE | `/api/cart/:id` | JWT | Remove item from cart |

### Rentals — `/api`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/check-availability` | JWT | Verify all cart items are available |
| POST | `/api/rent` | JWT | Checkout — creates rental order |
| GET | `/api/rentals` | JWT | Get user's rental history |
| GET | `/api/rentals/track` | JWT | Paginated order tracking with delivery info |
| POST | `/api/rentals/cancel/:id` | JWT | Cancel a pending or active rental |
| POST | `/api/rentals/return/:id` | JWT | Submit a return request |
| PUT | `/api/rentals/:id/switch-to-pickup` | JWT | Change delivery-type order to self-pickup |

### Delivery — `/api/delivery` *(Delivery Boy role required)*

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/delivery/orders` | Get currently assigned delivery orders |
| PUT | `/api/delivery/orders/:id/action` | Update delivery status (picked up, out for delivery, delivered, skip) |
| GET | `/api/delivery/returns` | Get assigned return pickup tasks |
| PUT | `/api/delivery/returns/:id/action` | Accept or reject a return pickup |
| PUT | `/api/delivery/returns/:id/picked` | Mark return as picked up from customer |
| GET | `/api/delivery/history` | Full delivery history (initial + return pickups) |
| GET | `/api/delivery/earnings` | View total earnings |

### Vendor — `/api/vendor` *(Vendor role required)*

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/vendor/me` | Get vendor status |
| GET | `/api/vendor/equipment` | List own equipment |
| POST | `/api/vendor/equipment` | Add new equipment (pending admin approval) |
| PUT | `/api/vendor/equipment/:id` | Update equipment |
| DELETE | `/api/vendor/equipment/:id` | Delete equipment |
| GET | `/api/vendor/orders` | View incoming rental orders |
| PUT | `/api/vendor/orders/:id/status` | Update order status |
| GET | `/api/vendor/rentals` | Rental history for own equipment |
| GET | `/api/vendor/earnings` | View earnings summary |
| GET | `/api/vendor/returns` | View return requests |
| POST | `/api/vendor/update-requests` | Propose a change to approved equipment |
| GET | `/api/vendor/update-requests` | View own submitted update requests |

### Admin — `/api/admin` *(Admin role required)*

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/users` | List all users |
| DELETE | `/api/admin/users/:id` | Delete a user |
| GET | `/api/admin/vendors` | List vendor applications |
| PUT | `/api/admin/vendors/:id/status` | Approve or reject a vendor |
| GET | `/api/admin/delivery-boys` | List delivery boy applications |
| PUT | `/api/admin/delivery-boys/:id/status` | Approve or reject a delivery boy |
| GET | `/api/admin/equipment-approvals` | List equipment pending approval |
| PUT | `/api/admin/equipment/:id/status` | Approve or reject equipment |
| POST | `/api/admin/equipment` | Add equipment directly |
| PUT | `/api/admin/equipment/:id` | Edit any equipment |
| DELETE | `/api/admin/equipment/:id` | Delete any equipment |
| GET | `/api/admin/orders` | View all rental orders |
| PUT | `/api/admin/orders/:id/status` | Update an order status |
| PUT | `/api/admin/orders/:id/assign-delivery` | Auto-assign a delivery boy to an order by city |
| GET | `/api/admin/returns` | View all return requests |
| GET | `/api/admin/categories` | List categories |
| POST | `/api/admin/categories` | Add category |
| PUT | `/api/admin/categories/:id` | Update category |
| DELETE | `/api/admin/categories/:id` | Delete category |
| GET | `/api/admin/update-requests` | View vendor update requests |
| PUT | `/api/admin/update-requests/:id` | Approve or reject an update request |

---

## 7. Database Collections

| Collection | Purpose |
|---|---|
| `users` | All users — customers, vendors, admins, and delivery boys |
| `equipments` | Equipment listings with embedded customer reviews |
| `rentals` | All rental orders — includes delivery tracking fields |
| `carts` | Temporary cart items with rental dates |
| `otps` | 6-digit codes for email verification and password reset |
| `notifications` | Admin and user alerts for key events |
| `categories` | Equipment categories |
| `tokenblacklists` | Revoked access tokens (cleared after expiry) |
| `vendorupdaterequests` | Vendor requests to modify approved equipment |

---

## 8. How It Works — User Journeys

### Customer with Home Delivery
1. Register with email OTP, log in.
2. Browse equipment, filter by city, select rental dates.
3. Add to cart. Go to checkout.
4. Select "Home Delivery", enter address. Pay via COD or Razorpay.
5. Vendor approves the order. Admin assigns a delivery boy.
6. The driver picks up from the vendor and delivers to the customer.
7. At end of rental, customer requests return — the system reassigns a driver to collect it.
8. Driver picks up the equipment and the order closes.

### Customer with Self-Pickup
1. Same steps as above up to checkout.
2. Select "Self Pickup" — no delivery charge.
3. After vendor approves, visit the vendor's location and collect on the rental start date.
4. At end of rental, return to the vendor's location and submit a return request from the app.
5. Vendor confirms return, order closes.

### Delivery Boy
1. Apply at `/delivery-signup` with driving license PDF.
2. Admin reviews and approves the application.
3. Log in — redirected to the delivery dashboard.
4. See assigned orders. Accept delivery, update status at each step.
5. Handle return pickups from the Returns tab.
6. Check earnings from the earnings card on the dashboard.

---

## ⚠️ Current Limitations

- Razorpay is in **test mode** only. No real money is charged.
- Delivery is city-based. Driver assignment picks the first available driver in the same city as the delivery address.
- If all drivers in a city skip an order, the delivery status is set to `failed` and the admin needs to manually intervene.
- Vendor and admin approvals are done manually through dashboards.
