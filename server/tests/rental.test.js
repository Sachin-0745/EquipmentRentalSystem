/**
 * tests/rental.test.js — Unit tests for controllers/rentalController.js
 * All Mongoose models and utilities are mocked. No real DB connection needed.
 */

jest.mock("../models/Rental");
jest.mock("../models/Equipment");
jest.mock("../models/Cart");
jest.mock("../models/Notification");
jest.mock("../utils/logger", () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
// withRetry: call the wrapped function immediately — no back-off delays in tests
jest.mock("../utils/reliability", () => ({ withRetry: jest.fn((fn) => fn()) }));

const rentalController = require("../controllers/rentalController");
const Rental           = require("../models/Rental");
const Equipment        = require("../models/Equipment");
const Cart             = require("../models/Cart");
const Notification     = require("../models/Notification");

const mockRes  = () => { const r = {}; r.status = jest.fn().mockReturnValue(r); r.json = jest.fn().mockReturnValue(r); return r; };
const mockNext = jest.fn();

const twoItems = [
  { equipment_id: "eq1", name: "Drill Machine",  start_date: "2026-06-01", end_date: "2026-06-05", quantity: 1, price: 200 },
  { equipment_id: "eq2", name: "Angle Grinder",  start_date: "2026-06-10", end_date: "2026-06-12", quantity: 2, price: 150 },
];

// ── CHECK AVAILABILITY ────────────────────────────────────────────────────────
describe("rentalController.checkAvailability", () => {
  test("400 when items array is missing", async () => {
    const res = mockRes();
    await rentalController.checkAvailability({ body: {} }, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Missing data" }));
  });

  test("reports conflict when equipment is fully booked", async () => {
    Equipment.findById = jest.fn().mockResolvedValue({ _id: "eq1", name: "Drill Machine", quantity: 2 });
    Rental.aggregate   = jest.fn().mockResolvedValue([{ totalRented: 2 }]);
    const res = mockRes();
    await rentalController.checkAvailability({ body: { items: [{ ...twoItems[0], quantity: 1 }] } }, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].conflicts[0].name).toBe("Drill Machine");
  });

  test("labels conflict 'Unknown' when equipment ID is invalid", async () => {
    Equipment.findById = jest.fn().mockResolvedValue(null);
    const res = mockRes();
    await rentalController.checkAvailability({ body: { items: [{ ...twoItems[0], equipment_id: "bad" }] } }, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].conflicts[0].name).toBe("Unknown");
  });

  test("200 when all items have sufficient stock", async () => {
    Equipment.findById = jest.fn().mockResolvedValue({ _id: "eq1", name: "Drill", quantity: 5 });
    Rental.aggregate   = jest.fn().mockResolvedValue([{ totalRented: 1 }]);
    const res = mockRes();
    await rentalController.checkAvailability({ body: { items: [{ ...twoItems[0], quantity: 2 }] } }, res, mockNext);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "All items available" }));
  });

  test("200 when no overlapping rentals exist at all", async () => {
    Equipment.findById = jest.fn().mockResolvedValue({ _id: "eq1", name: "Drill", quantity: 3 });
    Rental.aggregate   = jest.fn().mockResolvedValue([]);
    const res = mockRes();
    await rentalController.checkAvailability({ body: { items: [{ ...twoItems[0], quantity: 1 }] } }, res, mockNext);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "All items available" }));
  });
});

// ── RENT CHECKOUT ─────────────────────────────────────────────────────────────
describe("rentalController.rentCheckout", () => {
  const baseReq = {
    user: { id: "user123" },
    body: { items: twoItems, delivery_type: "pickup", delivery_address: "12 MG Road", delivery_city: "Jaipur", total_amount: 500 },
  };

  test("400 when cart is empty", async () => {
    const res = mockRes();
    await rentalController.rentCheckout({ user: { id: "u1" }, body: { items: [] } }, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Cart is empty" }));
  });

  test("400 when stock is insufficient for an item", async () => {
    Equipment.findById = jest.fn().mockResolvedValueOnce({ _id: "eq1", name: "Drill Machine", quantity: 0 });
    const res = mockRes();
    await rentalController.rentCheckout(baseReq, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toContain("Not enough stock");
  });

  test("200 — checkout inserts rentals, notifies admin, clears cart", async () => {
    Equipment.findById  = jest.fn().mockResolvedValue({ _id: "eq_ok", name: "Tool", quantity: 10 });
    Rental.insertMany   = jest.fn().mockResolvedValue([{ _id: "rental1" }, { _id: "rental2" }]);
    Notification.create = jest.fn().mockResolvedValue({});
    Cart.deleteMany     = jest.fn().mockResolvedValue({});
    const res = mockRes();
    await rentalController.rentCheckout(baseReq, res, mockNext);
    expect(Rental.insertMany).toHaveBeenCalledTimes(1);
    expect(Cart.deleteMany).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Rental placed successfully", orderIds: ["rental1", "rental2"] }));
  });

  test("calls next(error) when insertMany throws", async () => {
    Equipment.findById = jest.fn().mockResolvedValue({ quantity: 10 });
    Rental.insertMany  = jest.fn().mockRejectedValue(new Error("DB write error"));
    const next = jest.fn();
    await rentalController.rentCheckout(baseReq, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ── GET RENTALS ───────────────────────────────────────────────────────────────
describe("rentalController.getRentals", () => {
  test("200 — returns formatted rental list for logged-in user", async () => {
    const docs = [{
      _id: "r1",
      equipment_id: { _id: "eq1", name: "Drill", image: "drill.jpg" },
      start_date: new Date("2026-06-01"), end_date: new Date("2026-06-05"),
      total_price: 800, quantity: 2, status: "active",
      delivery_type: "pickup", delivery_address: "", delivery_status: null,
    }];
    const sortFn = jest.fn().mockResolvedValue(docs);
    const popFn  = jest.fn().mockReturnValue({ sort: sortFn });
    Rental.find  = jest.fn().mockReturnValue({ populate: popFn });

    const res = mockRes();
    await rentalController.getRentals({ user: { id: "user123" } }, res, mockNext);
    const result = res.json.mock.calls[0][0];
    expect(result.success).toBe(true);
    expect(result.data[0].name).toBe("Drill");
  });

  test("calls next(error) on DB failure", async () => {
    Rental.find = jest.fn().mockReturnValue({ populate: jest.fn().mockReturnValue({ sort: jest.fn().mockRejectedValue(new Error("fail")) }) });
    const next = jest.fn();
    await rentalController.getRentals({ user: { id: "u1" } }, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ── TRACK RENTALS (paginated) ─────────────────────────────────────────────────
describe("rentalController.trackRentals", () => {
  test("200 — returns paginated results with correct meta fields", async () => {
    Rental.countDocuments = jest.fn().mockResolvedValue(25);
    const docs = [{ _id: "r1", equipment_id: { name: "Projector" }, start_date: new Date(), end_date: new Date(), status: "active", delivery_status: null, delivery_boy_id: null }];
    const limitFn = jest.fn().mockResolvedValue(docs);
    const skipFn  = jest.fn().mockReturnValue({ limit: limitFn });
    const sortFn  = jest.fn().mockReturnValue({ skip: skipFn });
    const pop2Fn  = jest.fn().mockReturnValue({ sort: sortFn });
    const pop1Fn  = jest.fn().mockReturnValue({ populate: pop2Fn });
    Rental.find   = jest.fn().mockReturnValue({ populate: pop1Fn });

    const req = { user: { id: "user123" }, query: { page: "1", limit: "10" } };
    const res = mockRes();
    await rentalController.trackRentals(req, res, mockNext);
    const result = res.json.mock.calls[0][0];
    expect(result.meta.total).toBe(25);
    expect(result.meta.totalPages).toBe(3);
    expect(result.data[0].name).toBe("Projector");
  });
});

// ── CANCEL RENTAL ─────────────────────────────────────────────────────────────
describe("rentalController.cancelRental", () => {
  test("404 when rental not found for this user", async () => {
    Rental.findOne = jest.fn().mockResolvedValue(null);
    const res = mockRes();
    await rentalController.cancelRental({ params: { id: "r99" }, user: { id: "u1" } }, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("400 when rental is already completed", async () => {
    Rental.findOne = jest.fn().mockResolvedValue({ status: "completed" });
    const res = mockRes();
    await rentalController.cancelRental({ params: { id: "r1" }, user: { id: "u1" } }, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Cannot cancel this order" }));
  });

  test("400 when rental is in return_requested state", async () => {
    Rental.findOne = jest.fn().mockResolvedValue({ status: "return_requested" });
    const res = mockRes();
    await rentalController.cancelRental({ params: { id: "r1" }, user: { id: "u1" } }, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("200 — pending rental is cancelled and saved", async () => {
    const rental = { status: "pending", save: jest.fn().mockResolvedValue(true) };
    Rental.findOne = jest.fn().mockResolvedValue(rental);
    const res = mockRes();
    await rentalController.cancelRental({ params: { id: "r1" }, user: { id: "u1" } }, res, mockNext);
    expect(rental.status).toBe("cancelled");
    expect(rental.save).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Rental cancelled" }));
  });

  test("200 — active rental can also be cancelled", async () => {
    const rental = { status: "active", save: jest.fn().mockResolvedValue(true) };
    Rental.findOne = jest.fn().mockResolvedValue(rental);
    await rentalController.cancelRental({ params: { id: "r2" }, user: { id: "u1" } }, mockRes(), mockNext);
    expect(rental.status).toBe("cancelled");
  });
});

// ── RETURN RENTAL ─────────────────────────────────────────────────────────────
describe("rentalController.returnRental", () => {
  test("404 when rental not found", async () => {
    Rental.findOne = jest.fn().mockResolvedValue(null);
    const res = mockRes();
    await rentalController.returnRental({ params: { id: "r99" }, user: { id: "u1" } }, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("400 when rental is not active (e.g. pending)", async () => {
    Rental.findOne = jest.fn().mockResolvedValue({ status: "pending" });
    const res = mockRes();
    await rentalController.returnRental({ params: { id: "r1" }, user: { id: "u1" } }, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Rental is not active" }));
  });

  test("200 — active rental sets status to return_requested and notifies admin", async () => {
    const rental = { _id: "r1", status: "active", save: jest.fn().mockResolvedValue(true) };
    Rental.findOne      = jest.fn().mockResolvedValue(rental);
    Notification.create = jest.fn().mockResolvedValue({});
    const res = mockRes();
    await rentalController.returnRental({ params: { id: "r1" }, user: { id: "u1" } }, res, mockNext);
    expect(rental.status).toBe("return_requested");
    expect(rental.save).toHaveBeenCalledTimes(1);
    expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({ type: "admin_alert" }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Return requested successfully" }));
  });
});
