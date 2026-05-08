# EquipRent - Comprehensive Viva Preparation Guide
*(Aligned directly with Project SRS and actual MERN Implementation)*

This guide maps theoretical software engineering concepts from your SRS to the real, functional code running in your project. It is structured to help you answer any viva question comprehensively.

---

## 🔶 1. Functional Requirements Achievement

Here is how the system achieves the functional requirements defined in the SRS:

### FR-1: User Registration & Login
- **Module/Files**: `server/controllers/authController.js`, `server/models/User.js`, `server/models/OTP.js`.
- **Logic**: The SRS mandates secure account creation and validation. The system uses OTP (One-Time Password) sent via email (`nodemailer`) for registration. When logging in, credentials are authenticated, and a JWT is issued.
- **Database**: `users` and `otps` collections.
- **Justification**: Secures onboarding and verifies real-user identity before DB commitment. 

### FR-2: Equipment Browsing & Search
- **Module/Files**: `server/controllers/equipmentController.js`, `frontend/src/pages/Home.js`.
- **Logic**: Implements a `GET /api/equipment` endpoint. Users can search by name or filter by category and city.
- **Database**: `equipments` collection.
- **Justification**: Meets the SRS requirement to filter available equipment dynamically and display price/availability to the user.

### FR-3: Equipment Rental Request
- **Module/Files**: `server/controllers/rentalController.js`, `server/models/Rental.js`.
- **Logic**: The SRS specifies checking availability and reserving equipment while preventing double booking. The system creates a `Rental` document, and simultaneously queries existing rentals (`$or` operators on date ranges) to ensure no date overlaps occur before confirming the request.
- **Database**: `rentals` and `equipments` (to decrement quantity).
- **Justification**: Directly fulfills the core objective of automating equipment reservation error-free.

### FR-4: Rent Calculation
- **Module/Files**: `frontend/src/pages/Cart.js`, `server/controllers/rentalController.js`.
- **Logic**: Rent is calculated dynamically. Days between `start_date` and `end_date` are multiplied by the equipment's base `price`.
- **Justification**: Replaces manual calculation with an automated formula exactly as the SRS states.

### FR-5: Equipment Return & Payment Status
- **Module/Files**: `server/controllers/returnController.js`, `server/controllers/vendorController.js`.
- **Logic**: An order moves through enums: `pending` → `approved` → `active` (picked up) → `return_requested` → `completed`. Admins/Vendors update these via the dashboard, modifying the `payment_status` to `paid`.
- **Database**: `rentals` collection.
- **Justification**: Completes the lifecycle requirement for managing post-rental activity.

> **🌟 Overachievement Note for Viva:** The SRS only mandated Admin and Customer roles. Our project exceeds this by introducing a **Vendor** role (multi-vendor marketplace) and a **Delivery Boy** role, showing advanced architecture skills!

---

## 🔶 2. Non-Functional Requirements Achievement

- **NFR-1: Performance**: 
  - *Requirement*: Response time ≤ 2 seconds.
  - *Implementation*: Added in-memory caching middleware (`/server/middlewares/cache.js`) for frequently accessed data like Categories. Added Mongoose indexes on date fields.
- **NFR-2: Security**: 
  - *Requirement*: Secure login, prevent unauthorized access.
  - *Implementation*: Stateless JWT authentication. Helmet headers, NoSQL injection sanitizers (`mongo-sanitize`), and XSS protection (`xss-clean`).
- **NFR-3: Usability**: 
  - *Requirement*: Simple and user-friendly.
  - *Implementation*: Built a responsive React UI utilizing Tailwind CSS with clear feedback (Toast notifications, empty states).
- **NFR-4: Reliability**: 
  - *Requirement*: Accurate storage, prevent duplicates.
  - *Implementation*: Used ACID-compliant logic within Mongoose. React `ErrorBoundary` prevents total frontend crashes.
- **NFR-5: Scalability**: 
  - *Requirement*: Future online payment features.
  - *Implementation*: We actually built this! **Razorpay** is fully integrated for online checkout. Furthermore, image uploads were migrated to **Cloudinary** (`utils/imageProcessor.js`), scaling storage beyond local servers.

---

## 🔶 3. Core Feature Logic

### ✔ OTP System
- **Generation**: Handled in `authController.js` using a Math randomizer (`generateOTP`).
- **Storage**: Stored temporarily in the MongoDB `otps` collection along with the serialized pending `userData`. It is NOT stored in cookies/sessions.
- **Verification**: User inputs OTP, backend queries `OTP.findOne()`. If matched, creates the `User` doc.
- **Expiry**: MongoDB TTL (Time-To-Live) index on the `expires_at` field automatically deletes expired OTPs after 5 minutes.
- **Tools**: Sent via `nodemailer` using `utils/sendMail.js`.

### ✔ Authentication & Authorization
- **Login/Signup**: Verifies credentials, generates JWT.
- **Password Hashing**: `bcrypt.hash()` with 10 salt rounds used before saving to DB.
- **JWT Handling**: `jsonwebtoken` signs `userId` and `role`. The token is sent to the client and must be attached as a `Bearer` header for subsequent API requests.
- **Role-based Access**: Custom middlewares (`auth.js`) intercept requests and check the decoded token's role (e.g., `req.user.role === 'admin'`).

### ✔ Booking / Rental Flow
1. **Selection**: User clicks "Add to Cart"; frontend hits `/api/cart/add`.
2. **Checkout**: User selects dates in Cart. System checks `Rental` overlaps for date clashes to satisfy FR-3.
3. **Payment**: System hits `/api/rentals/checkout`, calculates total (FR-4), generates Razorpay `order_id`.
4. **Finalization**: Frontend captures payment, hits `/api/rentals/verifyPayment`. `Rental` status changes from `payment_pending` to `pending`. Cart is cleared.

---

## 🔶 4. Security Implementation

- **Input Validation**: Defined centrally in `middlewares/validate.js` using `express-validator`.
- **Sanitization**: `xss-clean` strips HTML tags to prevent Cross-Site Scripting. `express-mongo-sanitize` removes `$` and `.` operators to prevent NoSQL query hijacking.
- **Token Security**: JWTs are signed with a strong `JWT_SECRET` stored in `.env`.
- **Rate Limiting**: `express-rate-limit` prevents brute-force bot attacks on login/OTP routes.
- **Attacks Prevented**:
  - **XSS**: A hacker tries to put `<script>alert(1)</script>` in an equipment description. `xss-clean` strips it out.
  - **NoSQL Injection**: A hacker sends `{"email": {"$gt": ""}}` to bypass login. `mongo-sanitize` strips the `$`, blocking the attack.

---

## 🔶 5. Input Validation & Sanitization

- **Location**: Evaluated at the route level via `server/middlewares/validate.js`.
- **Libraries**: `express-validator`.
- **Code Example**: 
  ```javascript
  body("name").trim().isLength({ min: 3 }).withMessage("Name must be at least 3 chars");
  ```
- **Why it’s Critical**: Protects database schema integrity, prevents unhandled server exceptions (500 crashes), and acts as the first line of defense against malicious inputs.

---

## 🔶 6. Logging System

- **Types of Logs**: `error.log` (system crashes), `security.log` (failed logins/unauthorized attempts), `combined.log` (general API activity).
- **Implementation**: Configured using the **Winston** library (`utils/logger.js`).
- **Data Stored**: Timestamps, HTTP method, URL, status code, and detailed messages.
- **Location**: Physically stored in a `logs/` directory on the server.
- **Purpose**: Essential for debugging production issues and satisfying Forensic monitoring requirements.

---

## 🔶 7. Forensics & Monitoring

- **User Activities**: Handled via Winston logs capturing critical transactions (e.g., "Vendor Application Initiated", "Equipment Approved").
- **Suspicious Activity**: The security log captures 401 (Unauthorized) and 403 (Forbidden) access attempts, allowing admins to track IP addresses probing restricted endpoints.

---

## 🔶 8. Reliability & Scalability

- **Concurrency**: Node.js event-driven, non-blocking I/O architecture inherently handles high concurrency efficiently.
- **Database Scaling**: Critical queries (like checking date overlaps) use Compound Indexes:
  `rentalSchema.index({ equipment_id: 1, status: 1, start_date: 1, end_date: 1 });`
- **Asset Optimization**: Local image storage scales poorly. We integrated `Cloudinary` to host images, reducing bandwidth usage on the core Node server.

---

## 🔶 9. Code Structure & File Explanation

- **`server.js`**: The main entry point. Bootstraps Express, connects to MongoDB, injects global middleware, and mounts API routes.
- **`routes/`**: Route definitions mapping HTTP endpoints (e.g., `/api/admin/rentals`) to controllers. Separated by domain.
- **`controllers/`**: The core business logic. e.g., `rentalController.js` handles checkout. `vendorController.js` calculates vendor earnings.
- **`models/`**: Mongoose schemas defining the structure of MongoDB collections (e.g., `User.js`, `Equipment.js`).
- **`middlewares/`**: Interceptor functions. `auth.js` checks tokens; `upload.js` handles image parsing.

---

## 🔶 10. API Design & Integration Explanation

This project utilizes both custom-built internal APIs and robust third-party APIs to achieve a complete production-ready system.

### 10.1 Custom Internal APIs (Created by Us)
These are RESTful APIs built from scratch using Express.js to handle our specific business logic.
- **`POST /api/auth/signup`**: 
  - *Purpose*: Handles user onboarding.
  - *Working*: Takes user data, validates it, hashes the password using bcrypt, generates a 6-digit OTP, saves it temporarily, and triggers an email.
- **`GET /api/equipment`**: 
  - *Purpose*: Fetches available inventory for the frontend shop.
  - *Working*: Accepts query parameters (like category or city), queries MongoDB, and returns a JSON array of equipment.
- **`POST /api/rentals/checkout`**: 
  - *Purpose*: Core rental logic.
  - *Working*: Accepts cart items and dates. It calculates the total cost (FR-4), verifies availability against existing date overlaps (FR-3), and generates a Razorpay order ID.
- **`PUT /api/vendor/orders/:id/status`**: 
  - *Purpose*: State management for the rental lifecycle.
  - *Working*: Allows vendors to change an order's status (`approved`, `ready_for_pickup`). It verifies the user's role before updating the MongoDB document.

### 10.2 External & Third-Party APIs Reused
Instead of reinventing the wheel, we integrated established external APIs for complex, highly-regulated, or resource-heavy tasks:
- **Razorpay API**: 
  - *Why*: Processing raw credit card data requires strict legal PCI-DSS compliance, which is out of scope for a student project.
  - *What it does*: Handles secure payment gateways, UI popups, and bank routing. We just receive a secure `payment_id` upon success to verify the transaction.
- **Cloudinary API**: 
  - *Why*: Storing user-uploaded images on a local Node.js server causes disk bloat, slows down the server, and makes scaling difficult.
  - *What it does*: Hosts our equipment images on a global CDN and automatically compresses them to `.webp` formats for faster frontend loading.
- **Nodemailer (SMTP Mail API)**: 
  - *Why*: Building a custom mail server from scratch is extremely complex and prone to spam-blocking.
  - *What it does*: Interfaces with standard SMTP servers (like Gmail) to reliably deliver OTP emails to users during registration.

---

## 🔶 11. Database Design & Justification

### Why MongoDB? (Instead of MySQL)
If asked *“Why didn’t you use MySQL?”*, provide these strong justifications based on our implementation:
1. **Flexible Schema for Equipment**: In a rental system, equipment attributes vary wildly (a camera has "megapixels", a tent has "capacity", a drill has "voltage"). MongoDB’s NoSQL document structure allows us to store dynamic attributes easily without creating complex SQL `JOIN` tables or leaving hundreds of columns `NULL`.
2. **JavaScript Full-Stack (JSON/BSON)**: We use React (JS) on the frontend and Node (JS) on the backend. MongoDB natively stores BSON (binary JSON). This means data flows seamlessly from the database to the UI without the performance overhead of converting SQL rows into JavaScript objects (ORM overhead).
3. **Array Handling**: We can store things like Cart items or nested `vendor_status` history directly inside a user's document array, which is much faster to read than querying multiple relational tables.

### Architecture & Collections
- **User**: Stores credentials, role (`user`, `admin`, `vendor`), and contact info.
- **Equipment**: Stores item details, price, inventory `quantity`, and a `vendor_id` linking back to the User model.
- **Rental**: Core transactional model. Links `user_id` to `equipment_id`. Stores date ranges, total price, and multi-layered status fields.
- **Cart**: Temporary storage mapping a `user_id` to selected `equipment_id`s before checkout.

---

## 🔶 12. Possible Viva Questions & Answers

1. **Q: How did you implement FR-3 (preventing double booking)?**
   *A:* When a user selects a date range, the backend queries the `Rental` model for any existing active rentals for that `equipment_id` where the requested dates overlap with existing `start_date` and `end_date`. If a match is found, it blocks the booking.
2. **Q: How does your OTP system prevent replay attacks?**
   *A:* The system explicitly calls `OTP.deleteMany({ email })` before generating a new OTP. Plus, a TTL index physically deletes the OTP from MongoDB after 5 minutes.
3. **Q: Why did you use JWT instead of Session Cookies?**
   *A:* JWT is stateless. Our Node backend doesn't need to store session data in server memory, making the API faster and easier to scale.
4. **Q: The SRS mentions future online payment integration (NFR-5). Did you implement this?**
   *A:* Yes, I integrated the Razorpay API. The backend generates a Razorpay Order ID, the React frontend opens the payment gateway, and a backend webhook/verify endpoint securely validates the payment signature before confirming the rental.
5. **Q: What happens if a user bypasses frontend validation?**
   *A:* The backend relies on `express-validator`. Even if the React UI is bypassed, the backend middleware will catch invalid formats (like a 9-digit phone number) and return a 400 Bad Request before hitting the database.
6. **Q: How is vendor data strictly isolated from other vendors?**
   *A:* In `vendorController.js`, queries explicitly use `.populate({ path: "equipment_id", match: { vendor_id: req.user.id } })` to ensure vendors only see orders tied to their own equipment.

---

## 🔶 13. Limitations & Future Improvements

- **Current Limitations**: 
  - Payment transactions are localized. If a database crash occurs right after Razorpay captures money but before the `Rental` is saved, manual admin reconciliation is required (lacks strict 2-phase commits).
  - WebSockets (Socket.io) are implemented for notifications but could be expanded for live delivery tracking.
- **Future Improvements**:
  - Implement **Redis** for distributed caching instead of in-memory caching to support multi-server deployments.
  - Add an automated Cron job (using `node-cron`) to automatically mark rentals as "overdue" and apply late fees if they are not returned by the `end_date`.
