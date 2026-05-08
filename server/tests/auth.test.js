/**
 * tests/auth.test.js
 * Unit tests for controllers/authController.js
 *
 * Strategy: mock every Mongoose model and external utility so no real
 * DB connection is needed. Each test exercises pure business logic.
 */

// ── Hoisted mocks (must be before any require) ────────────────────────────
jest.mock("../models/User");
jest.mock("../models/OTP");
jest.mock("../models/Notification");
jest.mock("../utils/sendMail", () => jest.fn().mockResolvedValue(true));
jest.mock("../utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));
jest.mock("bcrypt");
jest.mock("jsonwebtoken");

const authController = require("../controllers/authController");
const User         = require("../models/User");
const OTP          = require("../models/OTP");
const bcrypt       = require("bcrypt");
const jwt          = require("jsonwebtoken");

// ── Helpers ───────────────────────────────────────────────────────────────
/** Build a mock Express res object that records calls. */
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

/** Minimal valid signup body. */
const validSignupBody = {
  name: "Sachin Meena",
  email: "sachin@example.com",
  mobile_no: "9876543210",
  password: "Secret@12",
  confirmPassword: "Secret@12",
};

// ═════════════════════════════════════════════════════════════════════════════
// SIGNUP
// ═════════════════════════════════════════════════════════════════════════════
describe("authController.signup", () => {
  test("400 when required fields are missing", async () => {
    const req = { body: { name: "", email: "", mobile_no: "", password: "", confirmPassword: "" } };
    const res = mockRes();
    await authController.signup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "All fields required" })
    );
  });

  test("400 when name contains numbers or special chars", async () => {
    const req = { body: { ...validSignupBody, name: "Sachin123" } };
    const res = mockRes();
    await authController.signup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("Name must not") })
    );
  });

  test("400 when mobile number is invalid (less than 10 digits)", async () => {
    const req = { body: { ...validSignupBody, mobile_no: "12345" } };
    const res = mockRes();
    await authController.signup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("Mobile number") })
    );
  });

  test("400 when mobile number starts with invalid digit (e.g. 1)", async () => {
    const req = { body: { ...validSignupBody, mobile_no: "1234567890" } };
    const res = mockRes();
    await authController.signup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("400 when email is malformed", async () => {
    const req = { body: { ...validSignupBody, email: "not-an-email" } };
    const res = mockRes();
    await authController.signup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid email address" })
    );
  });

  test("400 when passwords do not match", async () => {
    const req = { body: { ...validSignupBody, confirmPassword: "Different1" } };
    const res = mockRes();
    await authController.signup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Passwords do not match" })
    );
  });

  test("400 when password is too short (< 8 chars)", async () => {
    const req = { body: { ...validSignupBody, password: "short", confirmPassword: "short" } };
    const res = mockRes();
    await authController.signup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("8-12 characters") })
    );
  });

  test("400 when email or phone already registered", async () => {
    User.findOne = jest.fn().mockResolvedValue({ email: "sachin@example.com" });
    const req = { body: validSignupBody };
    const res = mockRes();
    await authController.signup(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Email or Phone already exists" })
    );
  });

  test("200 — successful signup sends OTP and returns message", async () => {
    User.findOne  = jest.fn().mockResolvedValue(null);
    User.create   = jest.fn().mockResolvedValue({});
    OTP.create    = jest.fn().mockResolvedValue({});
    bcrypt.hash   = jest.fn().mockResolvedValue("hashed_pw");
    const req = { body: validSignupBody };
    const res = mockRes();
    await authController.signup(req, res);
    expect(OTP.create).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("OTP sent") })
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// LOGIN
// ═════════════════════════════════════════════════════════════════════════════
describe("authController.login", () => {
  const req = { body: { email: "sachin@example.com", password: "Secret@12" } };

  test("400 when user does not exist", async () => {
    User.findOne = jest.fn().mockResolvedValue(null);
    const res = mockRes();
    await authController.login(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Invalid email or password" })
    );
  });

  test("400 when account is not verified", async () => {
    User.findOne = jest.fn().mockResolvedValue({ is_verified: false });
    const res = mockRes();
    await authController.login(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Please verify your account first" })
    );
  });

  test("400 when password is incorrect", async () => {
    User.findOne = jest.fn().mockResolvedValue({
      is_verified: true,
      password: "hashed_pw",
      email: "sachin@example.com",
      role: "user",
      _id: "uid1",
    });
    bcrypt.compare = jest.fn().mockResolvedValue(false);
    const res = mockRes();
    await authController.login(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid email or password" })
    );
  });

  test("200 — successful login returns token and role", async () => {
    const fakeUser = {
      is_verified: true,
      password: "hashed_pw",
      email: "sachin@example.com",
      role: "user",
      _id: "uid1",
      refresh_token: null,
      save: jest.fn().mockResolvedValue(true),
    };
    User.findOne   = jest.fn().mockResolvedValue(fakeUser);
    bcrypt.compare = jest.fn().mockResolvedValue(true);
    jwt.sign       = jest.fn().mockReturnValue("mock_jwt_token");
    const res = mockRes();
    await authController.login(req, res);
    expect(res.cookie).toHaveBeenCalledWith(
      "refreshToken",
      "mock_jwt_token",
      expect.any(Object)
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ token: "mock_jwt_token", role: "user" })
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// VERIFY OTP
// ═════════════════════════════════════════════════════════════════════════════
describe("authController.verifyOTP", () => {
  test("400 when OTP is invalid or expired", async () => {
    OTP.findOne = jest.fn().mockResolvedValue(null);
    const req   = { body: { email: "sachin@example.com", otp: "999999" } };
    const res   = mockRes();
    await authController.verifyOTP(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid or expired OTP" })
    );
  });

  test("200 — valid OTP verifies account and returns token", async () => {
    OTP.findOne = jest.fn().mockResolvedValue({ 
      email: "sachin@example.com", 
      otp: "123456", 
      userData: { 
        role: 'user', 
        name: 'Sachin', 
        toObject: function() { return { role: this.role, name: this.name }; }
      } 
    });
    const fakeUser = {
      email: "sachin@example.com",
      role: "user",
      _id: "uid1",
      refresh_token: null,
      save: jest.fn().mockResolvedValue(true),
    };
    User.findOne = jest.fn().mockResolvedValue(null);
    User.create  = jest.fn().mockResolvedValue(fakeUser);
    jwt.sign = jest.fn().mockReturnValue("verified_jwt");
    const req = { body: { email: "sachin@example.com", otp: "123456" } };
    const res = mockRes();
    await authController.verifyOTP(req, res);
    expect(User.create).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ token: "verified_jwt" })
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD & RESET PASSWORD
// ═════════════════════════════════════════════════════════════════════════════
describe("authController.forgotPassword", () => {
  test("200 — sends OTP when email is submitted", async () => {
    OTP.create = jest.fn().mockResolvedValue({});
    const req  = { body: { email: "sachin@example.com" } };
    const res  = mockRes();
    await authController.forgotPassword(req, res);
    expect(OTP.create).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "OTP sent" }));
  });
});

describe("authController.resetPassword", () => {
  test("400 when new passwords do not match", async () => {
    const req = { body: { email: "e@e.com", otp: "123456", newPassword: "Abc12345", confirmPassword: "Xyz12345" } };
    const res = mockRes();
    await authController.resetPassword(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Passwords do not match" })
    );
  });

  test("400 when password length is invalid", async () => {
    const req = { body: { email: "e@e.com", otp: "123456", newPassword: "ab", confirmPassword: "ab" } };
    const res = mockRes();
    await authController.resetPassword(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("400 when OTP is invalid or expired", async () => {
    OTP.findOne = jest.fn().mockResolvedValue(null);
    const req = { body: { email: "e@e.com", otp: "000000", newPassword: "Valid123", confirmPassword: "Valid123" } };
    const res = mockRes();
    await authController.resetPassword(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid or expired OTP" })
    );
  });

  test("200 — valid OTP resets password", async () => {
    OTP.findOne    = jest.fn().mockResolvedValue({ email: "e@e.com" });
    User.updateOne = jest.fn().mockResolvedValue({});
    bcrypt.hash    = jest.fn().mockResolvedValue("new_hashed");
    const req = { body: { email: "e@e.com", otp: "123456", newPassword: "Valid123", confirmPassword: "Valid123" } };
    const res = mockRes();
    await authController.resetPassword(req, res);
    expect(User.updateOne).toHaveBeenCalledWith({ email: "e@e.com" }, { password: "new_hashed" });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Password reset successful" })
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// REFRESH TOKEN
// ═════════════════════════════════════════════════════════════════════════════
describe("authController.refreshToken", () => {
  test("401 when no refresh token cookie is present", async () => {
    const req = { cookies: {} };
    const res = mockRes();
    await authController.refreshToken(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "No refresh token provided" })
    );
  });

  test("403 when token is revoked (not matching DB record)", async () => {
    jwt.verify = jest.fn().mockReturnValue({ id: "uid1" });
    User.findById = jest.fn().mockResolvedValue({
      is_verified: true,
      refresh_token: "different_token", // mismatch
    });
    const req = { cookies: { refreshToken: "stale_token" } };
    const res = mockRes();
    await authController.refreshToken(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid or revoked refresh token" })
    );
  });

  test("200 — valid token returns a new access token", async () => {
    jwt.verify = jest.fn().mockReturnValue({ id: "uid1" });
    const fakeUser = {
      email: "sachin@example.com",
      role: "user",
      _id: "uid1",
      is_verified: true,
      refresh_token: "valid_refresh",
    };
    User.findById = jest.fn().mockResolvedValue(fakeUser);
    jwt.sign = jest.fn().mockReturnValue("new_access_token");
    const req = { cookies: { refreshToken: "valid_refresh" } };
    const res = mockRes();
    await authController.refreshToken(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, token: "new_access_token" })
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// LOGOUT
// ═════════════════════════════════════════════════════════════════════════════
describe("authController.logout", () => {
  test("200 — logout clears cookie and invalidates tokens", async () => {
    User.findByIdAndUpdate = jest.fn().mockResolvedValue({});
    // Mock TokenBlacklist dynamically (required inside the controller)
    jest.mock("../models/TokenBlacklist", () => ({ create: jest.fn().mockResolvedValue({}) }), { virtual: true });
    const req = {
      user: { id: "uid1" },
      header: jest.fn().mockReturnValue("Bearer some_token"),
    };
    const res = mockRes();
    await authController.logout(req, res);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith("uid1", { refresh_token: null });
    expect(res.clearCookie).toHaveBeenCalledWith("refreshToken", expect.any(Object));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });
});
