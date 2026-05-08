# Project Documentation

## Online Equipment Rental System (EquipRent)

**Course:** Software Engineering Lab  
**Technology Stack:** Node.js · Express.js · MongoDB · React.js  
**Payment:** Razorpay (Test Mode)  
**Delivery:** Self-pickup, Self-return, and Home Delivery via Delivery Partners

---

## 1. Introduction

### 1.1 Purpose

The purpose of this system is to provide a complete, digital workflow for renting equipment from local vendors. Before this kind of platform existed, customers had to call vendors, physically visit shops, negotiate prices, and keep paper records. EquipRent puts the entire rental process online — customers browse equipment, select dates, pay digitally, and can even have their order delivered to their doorstep by a registered delivery partner.

### 1.2 Scope

The system covers:
- Customer registration, login, and profile management
- Equipment listing, browsing, searching, and filtering
- Cart management with rental date selection
- Rental checkout — self-pickup or home delivery, COD or online payment
- Order tracking and cancellation
- Return requests — self-return or delivery pickup
- A vendor dashboard for managing equipment and fulfilling orders
- A delivery boy dashboard for handling deliveries and return pickups
- An admin panel for platform-wide management including driver approvals and delivery assignment

---

## 2. System Overview

EquipRent is a three-tier web application:

- **Frontend (React.js):** The browser UI. Communicates with the backend over a REST API using Axios, with automatic token refresh on 401 errors.
- **Backend (Node.js + Express.js):** All business logic — authentication, rental processing, delivery assignment, payment, and role-based access.
- **Database (MongoDB):** Persistent storage for all data — users, equipment, rentals, carts, OTPs, notifications, categories.

The system has four user roles:

| Role | What they can do |
|---|---|
| **Customer** | Browse, rent, pay, track orders, request returns |
| **Vendor** | List equipment, manage orders, confirm returns, view earnings |
| **Delivery Boy** | Accept delivery assignments, update status, handle return pickups, view earnings |
| **Admin** | Manage users, approve vendors and drivers, manage equipment, assign deliveries |

---

## 3. Functional Requirements (Implemented)

### 3.1 Authentication

- A new user fills a registration form (name, email, mobile, password). The system validates all fields and sends a 6-digit OTP to the email.
- The user enters the OTP to activate the account. No user record is created in the database until OTP verification succeeds — the pending data is held in the `otps` collection.
- Login uses email and password. On success, a short-lived JWT access token (15-minute expiry) and an HTTP-only refresh token (7-day expiry) are issued.
- Logging out blacklists the access token and clears the refresh token from the database.
- A new access token can be obtained silently using the refresh token via an Axios response interceptor — the user does not need to log in again within 7 days.
- Forgot password: a 6-digit OTP is sent to the registered email. The user enters the OTP on the reset page along with the new password.
- Password validation: 8–12 characters, enforced on both frontend and backend.
- Profile updates: name, mobile number, city, and address can be updated from the profile page.

### 3.2 Vendor Registration

- Any registered user can apply to become a vendor by filling in shop details and uploading a PDF identity document (max 150 KB).
- The application goes to the admin for review. The vendor role is activated only after admin approval.
- If the admin rejects, a rejection reason is stored and a notification is created for the user.
- An approved vendor can then log in and access the vendor dashboard.

### 3.3 Delivery Boy Registration

- Anyone — including existing customers — can apply to join the delivery fleet.
- The registration form asks for name, email, mobile, city, vehicle model, and a driving license PDF (max 150 KB).
- **Branching Verification Logic:**
  - **Existing Users:** If the email/phone is already registered, the application is submitted directly to the admin for review without any OTP.
  - **New Users:** If it's a new account, a 6-digit OTP is sent to the email for identity verification before the application is submitted to the admin.
- Once approved by the admin, drivers get the `delivery_boy` role and can access their dashboard.

### 3.4 Equipment Management

- Vendors can add equipment with a name, description, category, price per day, city, quantity, and image.
- New equipment is set to `pending` and only goes live in customer listings after admin approval.
- Vendors can submit update requests for equipment that is already approved. The change is held pending and goes live only if the admin approves it.
- Vendors can delete their own equipment.
- The admin can add, edit, delete, approve, or reject any equipment on the platform.
- Equipment images are uploaded to Cloudinary. If Cloudinary is not configured, images go to the local `uploads/` folder.
- Bulk import of up to 200 equipment items at once is supported via a JSON payload (vendor and admin only).

### 3.5 Equipment Browsing and Search

- The dashboard is accessible to all visitors, including non-logged-in users.
- Customers can filter by city, category, and keyword.
- An advanced search endpoint supports full-text search on name and description, price range filters, and date-based availability filters — it only shows equipment that has stock available for the requested period.
- A calendar view on each equipment detail page shows fully booked dates for the next 90 days.
- Each equipment detail page shows the average rating and total review count from past customers.

### 3.6 Cart Management

- Logged-in customers can add equipment to a cart along with rental start and end dates.
- Quantity can be updated and items can be removed individually.
- Cart prices are not stored — they are always recalculated fresh from the equipment document at checkout to avoid stale price bugs.
- The cart is cleared for checked-out items after a successful rental order.

### 3.7 Rental Checkout

- Before checkout, the backend re-checks availability for all cart items. If any item is now out of stock for the selected dates, the customer is shown which items are conflicting.
- Rental cost is: `price per day × quantity × number of days`.
- The customer picks a delivery method:
  - **Self Pickup:** No extra charge. Customer visits the vendor's location.
  - **Home Delivery:** ₹50 delivery charge is added to the order total. A driver will be assigned.
- The customer picks a payment method:
  - **COD:** Order is placed with `payment_status: pending`.
  - **Online (Razorpay test mode):** A Razorpay order is created on the backend. The Razorpay payment modal opens in the browser. On success, the Razorpay Order ID is stored against the rental.
- For COD home delivery orders, the delivery boy is shown the collection amount on their dashboard and marks payment as collected upon delivery.

### 3.8 Delivery Workflow

This is a fully implemented feature. When a customer selects home delivery at checkout:

1. The vendor approves the rental order.
2. The admin views the order and clicks "Assign Driver." The system auto-selects an available delivery boy in the same city as the delivery address. If no driver is available in that city, it falls back to any available driver.
3. The assigned driver sees the order in their delivery dashboard with customer name, address, due date, quantity, and payment details.
4. The driver can accept and pick up the order (status: `picked_up`), then mark it out for delivery (status: `out_for_delivery`), then confirm delivery (status: `delivered`).
5. On confirmation, the rental status changes to `active` and payment is marked as collected if it was COD.
6. If a driver skips an order, the order is passed to the next available driver in the city. If all drivers skip, the delivery status is set to `failed`.
7. Customers can see their assigned delivery boy's name and phone number on the order tracking page.
8. As a fallback, a customer on a delivery order can switch it to self-pickup from the rental history page if needed.

### 3.9 Return Workflow

When a customer's rental period is over or they're done early, they submit a return request. There are two paths:

**Self-return:** The customer physically returns the equipment to the vendor's location. The vendor confirms the return on their dashboard, closing the order.

**Driver pickup return:** The system reassigns a delivery driver (clearing the skip list so all drivers are eligible again). The driver sees the return in the "Return Pickups" tab of their dashboard. They accept, go to the customer's address, collect the equipment, and mark it as picked up. The order status changes to `returned`.

Both types of return tasks appear separately in the delivery boy's history, and both count toward their earnings.

### 3.10 Delivery Boy Earnings

Each completed task — whether an initial delivery or a return pickup — earns the driver ₹30. The earnings are calculated by counting:
- Initial deliveries where `initial_delivery_boy_id` matches the driver's ID and delivery was completed.
- Return pickups where `delivery_boy_id` matches and the return was confirmed.

Total earnings = `(delivery count + return count) × ₹30`.

### 3.11 Order Tracking and Cancellation

- Customers see all their past and current orders on the rental history page.
- Each order shows status, equipment name, dates, cost, delivery type, delivery boy info (if assigned), and payment status.
- Customers can cancel an order in `pending`, `approved`, or `active` status.
- Order statuses: `pending`, `approved`, `rejected`, `active`, `completed`, `cancelled`, `return_requested`, `returned`.
- Delivery statuses: `pending`, `assigned`, `picked_up`, `out_for_delivery`, `delivered`, `ready_for_pickup`, `returned`, `failed`.

### 3.12 Reviews and Ratings

- Customers can submit a star rating (1–5) and a written comment on equipment they have rented.
- Reviews are stored as embedded documents inside the equipment record.
- Average rating and total review count are returned with every equipment listing and detail response.

### 3.13 Notifications

- The system creates in-app notifications for key events — new vendor applications, new delivery boy applications, return requests.
- Notifications are also pushed in real time via Socket.io to the admin panel.

### 3.14 Vendor Dashboard

- Vendors see a list of their equipment with current status and stock.
- Incoming rental requests can be approved or rejected.
- Vendors can view and confirm return requests from customers.
- An earnings summary shows revenue from completed and active orders.
- Vendors can submit update requests for approved equipment and track their request status.

### 3.15 Admin Panel

- Full user management: view all users, delete accounts.
- Vendor management: view applications with uploaded documents, approve or reject.
- Delivery boy management: view applications with driving license documents, approve or reject.
- Equipment approvals: review and approve or reject new listings from vendors.
- Process vendor equipment update requests.
- Direct equipment CRUD: add, edit, delete any equipment.
- Category management: create, rename, delete categories.
- View all rental orders across all vendors with customer and vendor info.
- Assign delivery boys to approved delivery-type orders (auto-picks by city).
- View all return requests with assigned driver details.

---

## 4. Non-Functional Aspects

### 4.1 Input Validation

All endpoints that accept user data use `express-validator` rules. Validation covers required fields, email format, mobile number format (10 digits starting with 5–9), password length (8–12 characters), and rental date ranges. Errors are returned as structured JSON before any database operation runs.

### 4.2 Authentication Security

- Passwords are hashed with `bcrypt` (10 rounds) before storage.
- JWT access tokens expire in 15 minutes. Refresh tokens expire in 7 days and are stored in the database so they can be revoked.
- On logout, the access token is added to a `TokenBlacklist` collection and the refresh token is deleted from the user record.
- All protected routes check the token against the blacklist before processing the request.
- Forgot password OTPs are deleted from the database after use and before a new one is created, preventing accumulation.

### 4.3 Response Caching

The equipment listing (`GET /api/equipment`) and booked-dates (`GET /api/equipment/:id/booked-dates`) endpoints use an in-memory cache with a TTL of 90 seconds and 60 seconds respectively. This reduces repeated database hits for the most commonly accessed read-only endpoints.

### 4.4 Database Indexing

Mongoose schemas define compound indexes on the most frequent query patterns:
- `Equipment`: city + status + category (main listing filter), text index on name and description (search).
- `Rental`: equipment_id + status + start_date + end_date (availability overlap check), user_id + createdAt (rental history fetch).
- `User`: role + vendor_status (admin vendor listing), city (driver assignment lookup).

### 4.5 File Upload Limits

Document uploads (vendor applications and delivery boy licenses) are limited to PDF format with a maximum size of 150 KB. Equipment images support JPEG and PNG. Multer enforces the size limits before any file is saved or sent to Cloudinary.

### 4.6 Error Handling

A global error handler middleware in `server.js` catches all unhandled errors and returns a consistent JSON response. A custom `asyncHandler` utility wraps controller functions to forward errors to this handler without repetitive try-catch blocks. On the frontend, per-route React Error Boundaries catch JavaScript errors in any page component — a crash in one page does not affect the rest of the app.

### 4.7 Rate Limiting

Authentication routes (`/api/auth/*`) use a stricter rate limiter than general API routes to reduce brute-force risks. All `/api` routes share a general rate limiter applied at the router level.

---

## 5. System Architecture

```
Browser (React.js)
       |
       |  HTTP REST + Socket.io
       |
Express.js Server (Node.js)
       |
       |── Middlewares: JWT auth · role guards · validation · cache · rate limiter · sanitize
       |── Controllers: auth · equipment · cart · rental · delivery · vendor · admin · review
       |── Utils: logger · mailer · socket · asyncHandler · pagination · reliability
       |
MongoDB (Mongoose)
       |
       |── users · equipments · rentals · carts
       |── otps · notifications · categories
       |── tokenblacklists · vendorupdaterequests
```

**Delivery assignment flow example:**
1. Customer checks out with home delivery. Rental records are created with `delivery_type: "delivery"`.
2. Vendor approves the order (status → `approved`).
3. Admin clicks "Assign Driver" on the order. Backend queries for an approved `delivery_boy` with a matching city, excluding any drivers in the `skipped_by` array.
4. `delivery_boy_id` is set, `delivery_status` becomes `assigned`.
5. Driver sees the order in their dashboard. Accepts → `picked_up`. Marks as en route → `out_for_delivery`. Confirms delivery → `delivered`, rental status → `active`.
6. If the driver skips, their ID is added to `skipped_by` and the order returns to unassigned. Next assignment attempt skips them.

---

## 6. Module Description

### 6.1 Authentication Module

**Files:** `authController.js`, `routes/auth.js`, `middlewares/auth.js`, `models/User.js`, `models/OTP.js`, `models/TokenBlacklist.js`

Handles all user identity operations. Registration uses a two-step OTP flow — user data is held in the `otps` collection until the OTP is verified, then the user record is created. This avoids unverified accounts in the `users` collection. The same flow is used for vendor and delivery boy sign-up. The middleware file provides guards: `auth` (verify JWT), `isAdmin`, `isVendor`, and `isDeliveryBoy`.

### 6.2 Equipment Module

**Files:** `equipmentController.js`, `routes/equipment.js`, `models/Equipment.js`, `models/Category.js`

Manages the product catalogue. Equipment has an approval workflow — created as `pending`, must be set to `approved` before it appears in public listings. Reviews are embedded as a subdocument array inside the equipment record, keeping ratings co-located with the product and avoiding an extra collection join.

### 6.3 Cart Module

**Files:** `cartController.js`, `routes/cart.js`, `models/Cart.js`

A simple per-user cart storing equipment ID, quantity, and rental date range. No prices are stored in the cart — they are always fetched fresh from the equipment document at checkout.

### 6.4 Rental Module

**Files:** `rentalController.js`, `routes/rental.js`, `models/Rental.js`

The core transactional module. Handles availability checking, order creation, payment branching (COD vs Razorpay), delivery type branching, cancellation, and return requests. The `Rental` schema includes all delivery tracking fields: `delivery_type`, `delivery_boy_id`, `initial_delivery_boy_id`, `delivery_status`, `skipped_by`, and `return_method`.

### 6.5 Delivery Module

**Files:** `deliveryController.js`, `routes/delivery.js`

The delivery boy's workspace. Handles fetching assigned orders, updating delivery status step by step, managing return pickup tasks, and calculating earnings. History tracking is dual — initial deliveries are tracked via `initial_delivery_boy_id` and return pickups via `delivery_boy_id`, so both phases contribute to earnings and history.

### 6.6 Payment Module

**Files:** `paymentController.js`, `routes/payment.js`, `utils/razorpay.js`

Thin integration layer for Razorpay. The Razorpay order is created inside `rentalController.js` during checkout and the order ID is returned to React. The frontend opens the Razorpay modal. COD payment is collected by the delivery boy at the door and marked as paid when the driver confirms delivery.

### 6.7 Vendor Module

**Files:** `vendorController.js`, `routes/vendor.js`, `models/VendorUpdateRequest.js`

The vendor's private workspace. Vendors see only their own equipment and orders. The update request system lets vendors propose changes to already-approved equipment without bypassing admin review.

### 6.8 Admin Module

**Files:** `adminController.js`, `routes/admin.js`

Platform-wide control. The admin manages all users, vendors, delivery boys (with document review), equipment approvals, categories, orders, and returns. The delivery assignment endpoint auto-selects a driver by city from the pool of approved drivers excluding those who already skipped the order.

### 6.9 Review Module

**Files:** `reviewController.js`, `routes/review.js`

Customers can leave a star rating and a comment on equipment. Reviews are saved as embedded documents inside the equipment record. Average rating is recalculated by reducing the embedded array.

### 6.10 Notification Module

**Files:** `notificationController.js`, `routes/notification.js`, `models/Notification.js`, `utils/socket.js`

Creates and delivers system notifications. Used for vendor application alerts, delivery boy application alerts, and return request alerts. Notifications are stored in MongoDB and also pushed in real time to connected admin clients via Socket.io.

---

## 7. Database Design

### Collections and Relationships

```
users (1) ─────────────── (many) equipments          [via vendor_id]
users (1) ─────────────── (many) rentals             [via user_id]
users (1) ─────────────── (many) rentals             [via delivery_boy_id]
users (1) ─────────────── (many) carts               [via user_id]
equipments (1) ─────────── (many) rentals            [via equipment_id]
equipments (1) ─────────── (many) carts              [via equipment_id]
equipments (1) ─────────── (embedded) reviews        [subdocument array]
rentals (1) ──────────────── (1) payment info        [fields inside rental]
rentals (1) ──────────────── (1) delivery tracking   [fields inside rental]
```

### Schema Summaries

**users**
```
_id, name, email, password (hashed), role (user|vendor|admin|delivery_boy),
mobile_no, city, address, is_verified,
vendor_status (pending|approved|rejected), shop_name, document_url, id_proof_url,
delivery_status (pending|approved|rejected), vehicle_details,
rejection_reason, refresh_token, createdAt, updatedAt
```

**equipments**
```
_id, name, description, price, category, quantity, image, city,
status (pending|approved|rejected), vendor_id (ref: users),
reviews: [{ user_id, rating, comment, createdAt }],
createdAt, updatedAt
```

**rentals**
```
_id, user_id (ref: users), equipment_id (ref: equipments),
start_date, end_date, quantity, total_price,
status (pending|approved|rejected|active|completed|cancelled|return_requested|returned),
payment_method (COD|ONLINE), payment_status (pending|paid|failed),
razorpay_order_id, razorpay_payment_id,
delivery_type (pickup|delivery), delivery_address, delivery_city, delivery_lat, delivery_lng,
delivery_boy_id (ref: users), initial_delivery_boy_id (ref: users),
delivery_status (pending|assigned|picked_up|out_for_delivery|delivered|ready_for_pickup|returned|failed),
skipped_by: [ObjectId],
return_method (pickup|self_return), return_status (pending|verified),
createdAt, updatedAt
```

**carts**
```
_id, user_id (ref: users), equipment_id (ref: equipments),
quantity, start_date, end_date, createdAt
```

**otps**
```
_id, email, otp, expires_at,
userData: { name, mobile_no, password (hashed), role, shop_name, address, city,
            vehicle_details, document_url, id_proof_url }
```

**notifications**
```
_id, user_id (optional ref), type, message, createdAt
```

**categories**
```
_id, name, createdAt, updatedAt
```

**tokenblacklists**
```
_id, token, expires_at
```

**vendorupdaterequests**
```
_id, vendor_id (ref: users), equipment_id (ref: equipments),
request_type (edit|delete|add), details (proposed changes),
status (pending|approved|rejected), createdAt
```

---

## 8. Conclusion

EquipRent is a fully functional full-stack rental management platform covering the complete lifecycle — from user registration with OTP email verification, through browsing and cart management, to checkout with integrated payment (Razorpay test mode), and all the way through to order fulfillment with an actual delivery partner system.

The platform supports four distinct user roles — Customer, Vendor, Delivery Boy, and Admin — each with separate dashboards and access controls. An approval workflow ensures vendors and delivery drivers are vetted by an admin before they go active. The delivery system handles both outbound deliveries and return pickups, with earnings calculated per task and dual history tracking so both phases are credited to the correct driver.

Razorpay currently runs in test mode only and does not process real payments. Driver assignment is city-based with manual admin initiation rather than a fully automated trigger.
