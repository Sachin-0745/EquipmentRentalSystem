/**
 * tests/vendor.test.js
 * Unit tests for controllers/vendorController.js
 */

jest.mock("../models/User");
jest.mock("../models/Equipment");
jest.mock("../models/Rental");
jest.mock("../models/VendorUpdateRequest");
jest.mock("../utils/imageProcessor", () => ({
  processImage: jest.fn().mockResolvedValue({ webp: "mock.webp" }),
}));
jest.mock("../middlewares/cache", () => ({
  invalidateCache: jest.fn(),
}));
jest.mock("../utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const vendorController = require("../controllers/vendorController");
const User = require("../models/User");
const Equipment = require("../models/Equipment");
const Rental = require("../models/Rental");
const VendorUpdateRequest = require("../models/VendorUpdateRequest");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("vendorController.getVendorEquipment", () => {
  test("returns vendor equipment", async () => {
    Equipment.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([{ name: "Vendor Drill" }]),
    });
    const req = { user: { id: "v1" } };
    const res = mockRes();
    await vendorController.getVendorEquipment(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ name: "Vendor Drill" }] });
  });
});

describe("vendorController.getVendorEarnings", () => {
  test("calculates total earnings correctly", async () => {
    const mockRentals = [
      { total_price: 100, equipment_id: { _id: "eq1" } },
      { total_price: 200, equipment_id: { _id: "eq2" } },
    ];
    Rental.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockRentals),
    });
    const req = { user: { id: "v1" } };
    const res = mockRes();
    await vendorController.getVendorEarnings(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, total_earnings: 300 });
  });
});

describe("vendorController.createEquipment", () => {
  test("400 if missing required fields", async () => {
    const req = { body: { name: "Missing fields" }, user: { id: "v1" } };
    const res = mockRes();
    await vendorController.createEquipment(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("creates equipment with optimized image", async () => {
    Equipment.create.mockResolvedValue({ _id: "new_eq" });
    const req = {
      user: { id: "v1" },
      body: { name: "Drill", price: 100, quantity: 5, category: "Tools", city: "X" },
      file: { path: "local_path.jpg" },
    };
    const res = mockRes();
    await vendorController.createEquipment(req, res);
    expect(Equipment.create).toHaveBeenCalledWith(expect.objectContaining({
      image: "mock.webp",
      vendor_id: "v1",
      status: "pending",
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: "new_eq" }));
  });
});

describe("vendorController.deleteEquipment", () => {
  test("404 if equipment not found or unauthorized", async () => {
    Equipment.findOneAndDelete.mockResolvedValue(null);
    const req = { params: { id: "eq1" }, user: { id: "v1" } };
    const res = mockRes();
    await vendorController.deleteEquipment(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("deletes equipment and invalidates cache", async () => {
    Equipment.findOneAndDelete.mockResolvedValue({ _id: "eq1" });
    const req = { params: { id: "eq1" }, user: { id: "v1" } };
    const res = mockRes();
    const { invalidateCache } = require("../middlewares/cache");
    await vendorController.deleteEquipment(req, res);
    expect(invalidateCache).toHaveBeenCalledWith("/api/equipment");
    expect(res.json).toHaveBeenCalledWith({ message: "Equipment deleted" });
  });
});
