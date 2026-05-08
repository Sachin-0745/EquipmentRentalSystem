# Project Analysis & SRS Mapping Report
**Project Name:** EquipRent (Equipment Rental System)
**Tech Stack:** Node.js, Express, MongoDB (Mongoose), React.js

---

## 🏗️ 1. Overall System Architecture

The application follows a standard **MERN Stack MVC (Model-View-Controller) Architecture**. 

* **Frontend (React):** Acts as the View. It manages UI state, routing (React Router), and user interactions. When a user performs an action (e.g., logging in or adding an item to the cart), the frontend uses `axios` (via a centralized `API` service) to send HTTP requests to the backend.
* **Backend (Node.js/Express):** Acts as the Controller and Router. It receives HTTP requests, routes them to the appropriate modular router (e.g., `routes/cart.js`), checks security using middleware (e.g., `middlewares/auth.js`), and executes business logic in the controllers (e.g., `cartController.js`).
* **Database (MongoDB):** Acts as the Model. Controllers communicate with MongoDB via **Mongoose ORM** to perform CRUD operations. The database securely stores JSON documents representing Users, Equipment, Rentals, etc.

**Request-Response Flow:**
1. **Client Action:** User clicks "Checkout" on the React frontend.
2. **API Call:** Frontend sends a `POST /api/cart/checkout` request with a JWT token in the headers.
3. **Middleware:** `authMiddleware` intercepts the request, verifies the JWT signature, and extracts `req.user.id`.
4. **Controller Logic:** `cartController.checkout` calculates total prices, validates date availability via MongoDB Aggregation Pipelines, and places the order.
5. **Database Operation:** Mongoose saves the new `Rental` document.
6. **Response:** Controller sends `{ success: true, message: "Order placed" }` back to the React frontend.

---

## 📂 File-by-File Analysis & SRS Mapping

### 📄 File: `Backend/server.js`
**1. What it does:** The entry point of the Node.js backend. It sets up the Express server, configures global middleware (CORS, body parsing), mounts all modular routes, and starts the server listener.
**2. Why it exists:** To act as the central nervous system of the backend API.
**3. Key Responsibilities:** Initializing Express, mounting API endpoints (`/api/auth`, `/api/equipment`, etc.), handling global unhandled errors, and bootstrapping the app.
**4. Requirement Fulfilled:** Non-Functional: System Architecture & Initialization.
**5. How Requirement is Achieved:** Uses `app.use()` to chain middlewares and delegate routing to modular files, keeping the application scalable.
**6. Dependencies:** Express, dotenv, all route files in `/routes`.

### 📄 File: `Backend/mongoDB.js`
**1. What it does:** Establishes the connection to the MongoDB Atlas cluster.
**2. Why it exists:** To decouple database connection logic from the main server file for cleaner code.
**3. Key Responsibilities:** Connecting via Mongoose using connection strings stored in `.env`.
**4. Requirement Fulfilled:** Non-Functional: Data Persistence & Scalability.
**5. How Requirement is Achieved:** Utilizes `mongoose.connect()` with asynchronous `try/catch` to ensure the server gracefully logs database connection success or failure.
**6. Dependencies:** Mongoose.

### 📄 File: `Backend/middlewares/auth.js`
**1. What it does:** Intercepts API requests to verify if the user is authenticated and authorized.
**2. Why it exists:** To protect private routes (like profile, checkout, admin dashboards) from unauthorized access.
**3. Key Responsibilities:** Validating JWT tokens, checking the `TokenBlacklist` for logged-out tokens, and verifying roles (`isAdmin`, `isVendor`).
**4. Requirement Fulfilled:** Functional: User Authentication & Role-Based Access Control (RBAC).
**5. How Requirement is Achieved:** Extracts the token from the `Authorization: Bearer` header, uses `jsonwebtoken.verify()`, and attaches the decoded user object to `req.user`. 
**6. Dependencies:** jsonwebtoken, TokenBlacklist model.

### 📄 File: `Backend/controllers/authController.js`
**1. What it does:** Contains the core business logic for user registration, login, and session management.
**2. Why it exists:** To process authentication payloads, hash passwords securely, and issue session tokens.
**3. Key Responsibilities:** Hashing passwords, validating uniqueness, generating JWTs, and managing token blacklisting (logout).
**4. Requirement Fulfilled:** Functional: User Management & Authentication.
**5. How Requirement is Achieved:** Uses `bcryptjs` to hash incoming passwords before saving them via `User.create()`. During login, uses `bcrypt.compare()` to verify credentials and issues a signed JWT token.
**6. Dependencies:** User Model, TokenBlacklist Model, bcryptjs, jsonwebtoken.

### 📄 File: `Backend/controllers/rentalController.js`
**1. What it does:** Handles the logic for placing orders, checking equipment availability, and tracking rentals.
**2. Why it exists:** To ensure that equipment is successfully booked without date collisions.
**3. Key Responsibilities:** Availability validation, cart checkout, fetching user order history.
**4. Requirement Fulfilled:** Functional: Equipment Booking & Checkout.
**5. How Requirement is Achieved:** Uses MongoDB Aggregation pipelines (`$match`, `$and`) to check if requested dates overlap with active rentals in the database. If available, it moves items from the user's cart to the Rentals collection.
**6. Dependencies:** Rental Model, Equipment Model, Cart Model.

### 📄 File: `Backend/controllers/vendorController.js`
**1. What it does:** Manages vendor-specific operations like uploading products, checking earnings, and viewing their specific orders.
**2. Why it exists:** To isolate vendor logic from admin or customer logic.
**3. Key Responsibilities:** Vendor dashboard aggregations, equipment CRUD restricted by `vendor_id`.
**4. Requirement Fulfilled:** Functional: Vendor Dashboard & Equipment Management.
**5. How Requirement is Achieved:** All Mongoose queries implicitly filter by `vendor_id: req.user.id` to ensure data isolation. Uses `.populate()` to fetch related equipment details dynamically.
**6. Dependencies:** Equipment Model, Rental Model.

### 📄 File: `frontend/src/pages/dashboard.js` (Frontend)
**1. What it does:** Displays the main shopping grid of available equipment to customers.
**2. Why it exists:** Serves as the primary marketplace interface.
**3. Key Responsibilities:** Fetching equipment lists, rendering search/filter UI, and displaying product cards.
**4. Requirement Fulfilled:** Functional: Equipment Discovery & Filtering.
**5. How Requirement is Achieved:** Uses React `useEffect` to trigger an API call to `/api/equipment` with query parameters (search, category, city) mapped to state variables. Updates UI reactively.
**6. Dependencies:** React hooks, API Service, ProductCard components.

### 📄 File: `frontend/src/services/api.js` (Frontend)
**1. What it does:** Centralized Axios instance for making API calls.
**2. Why it exists:** Prevents repeating `fetch()` headers and token logic across dozens of files.
**3. Key Responsibilities:** Automatically attaching JWT tokens to outgoing requests via Axios interceptors.
**4. Requirement Fulfilled:** Non-Functional: Code Maintainability & Security.
**5. How Requirement is Achieved:** Uses `axios.interceptors.request.use` to pull the token from `localStorage` and inject it into the `Authorization` header dynamically.
**6. Dependencies:** Axios.

---

## ⚙️ 2. Functional Requirements Analysis

### ✅ Achieved
* **User Authentication & Profiles:** Users can securely sign up, log in, manage profiles, and log out. Tokens are properly blacklisted upon logout.
* **Role-Based Access Control:** Distinct dashboards and permissions for Admins, Vendors, Delivery Boys, and Customers.
* **Marketplace & Discovery:** Equipment is loaded dynamically, paginated, and searchable.
* **Shopping Cart & Checkout:** Date-based availability checking prevents double-booking. Cart seamlessly converts to Rentals.
* **Notifications:** Real-time logging of system events (order placed, approved, rejected) accessible via a Navbar dropdown.

### 🟡 Partially Achieved
* **Returns & Delivery Logistics:** The API logic exists (`deliveryController.js`, `returnController.js`) and status updates work, but advanced edge cases (e.g., delivery route mapping, physical signature capture) are missing.
* **Payments:** The Razorpay Webhook is verified in the backend, but the frontend UI handling of payment retries or split-payments might require deeper integration.

### ❌ Not Implemented
* **Real-time Chat:** Communication between customer and vendor is currently handled via simple Notifications; there is no WebSockets/Socket.io real-time chat.
* **Advanced Analytics:** Vendor earnings exist as a sum total, but there are no graph/chart datasets generated dynamically for complex business intelligence.

---

## 🛡️ 3. Non-Functional Requirements Analysis

* **Security:** ✅ **Achieved.** Deeply integrated JWT authentication, bcrypt password hashing, input validation middlewares, and Mongoose schema sanitization (preventing SQL Injection entirely).
* **Performance:** ✅ **Achieved.** Replaced heavy multi-table SQL JOINs with highly optimized MongoDB Aggregation pipelines and nested `.populate()` calls.
* **Scalability:** ✅ **Achieved.** The backend is entirely modular and stateless, meaning it is horizontally scalable. The database is hosted on MongoDB Atlas, allowing instant auto-scaling.
* **Maintainability:** ✅ **Achieved.** Separated concerns perfectly (Routes -> Controllers -> Services -> Models). No more massive 1500-line monolithic files.
* **Usability:** 🟡 **Needs Improvement.** While the backend is robust, frontend UI edge states (loading spinners, offline fallbacks) could be polished further.

---

## 🔍 4. Mapping SRS → Implementation

| SRS Requirement | File(s) Responsible | How Achieved |
| --------------- | ------------------- | ------------ |
| **User Registration** | `authController.js`, `User.js` | Uses bcrypt to hash passwords, saves Mongoose document. |
| **Authentication/Session** | `auth.js` (Middleware) | Verifies JWT tokens on secure routes. Checks TokenBlacklist. |
| **Vendor Equipment Upload** | `vendorController.js`, `validate.js` | Uses Multer for image upload, saves to MongoDB with `status: pending`. |
| **Admin Approval System** | `adminController.js` | Admin queries `Equipment.find({ status: "pending" })` and updates status. |
| **Date-based Availability** | `equipmentController.js` | Aggregation pipeline checks requested dates against `Rental` start/end dates. |
| **Checkout/Cart** | `cartController.js`, `rentalController.js` | Validates cart items, generates Rental orders, empties Cart document. |
| **Delivery Management** | `deliveryController.js` | Delivery boys update `delivery_status` field in Rental documents. |

---

## ⚠️ 5. Issues & Improvements

**Identified Issues:**
1. **Local Image Storage:** Images are currently saved locally via Multer to `/uploads/`. If the server restarts or scales to multiple servers, images will break.
2. **Hardcoded Payment Logic:** The payment status logic relies heavily on basic string checking without rigorous state machine enforcement.

**Suggested Improvements (To Make it Industry-Level):**
* **Cloud Storage:** Integrate AWS S3 or Cloudinary to replace local Multer storage for equipment images.
* **Caching Layer:** Integrate Redis for caching the `GET /api/equipment` marketplace endpoints to heavily reduce MongoDB reads.
* **Socket.io:** Implement WebSockets for live tracking of Delivery Boys and real-time instant notifications (rather than polling or refresh-based loading).

---

## 🚀 6. Final Summary (Interview Prep)

**Project Elevator Pitch:**
> "I built EquipRent, a full-stack MERN equipment rental platform featuring Role-Based Access Control. It facilitates a complete ecosystem connecting Customers who need equipment, Vendors who supply it, Delivery Personnel who transport it, and Admins who oversee operations. I architected the backend utilizing Express and Mongoose to ensure scalable data relations, and implemented dynamic date-based inventory tracking using MongoDB Aggregation Pipelines to prevent double-booking."

**Strengths:**
* Extremely modular and readable backend architecture.
* Strong security posture (RBAC, JWT blacklisting, Input validation).
* Complex business logic (date availability intersections) successfully migrated from raw SQL to efficient NoSQL Aggregations.

**Weaknesses:**
* Relies on local file storage for images.
* Lacks complex business intelligence dashboards (graphs).

**What to add for Industry-Level:**
* Migrate image uploads to AWS S3.
* Add comprehensive Unit Tests (Jest/Mocha) for the Controller logic.
* Implement a CI/CD pipeline (GitHub Actions) for automated deployment.
