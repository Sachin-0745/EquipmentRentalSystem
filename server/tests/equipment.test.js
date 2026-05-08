/**
 * tests/equipment.test.js
 * Unit tests for controllers/equipmentController.js
 */

jest.mock("../models/Equipment");
jest.mock("../models/Rental");
jest.mock("../services/equipmentService");
jest.mock("../utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const equipmentController = require("../controllers/equipmentController");
const Equipment = require("../models/Equipment");
const Rental = require("../models/Rental");
const equipmentService = require("../services/equipmentService");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("equipmentController.getEquipment", () => {
  test("returns paginated equipment list", async () => {
    equipmentService.getPaginatedEquipment.mockResolvedValue({
      total: 1,
      data: [{ name: "Drill" }],
    });
    const req = { query: { page: 1, limit: 10 } };
    const res = mockRes();
    await equipmentController.getEquipment(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Array),
        pagination: expect.objectContaining({ totalItems: 1 }),
      })
    );
  });
});

describe("equipmentController.searchEquipment", () => {
  test("filters by name and price range", async () => {
    Equipment.countDocuments.mockResolvedValue(1);
    Equipment.aggregate.mockResolvedValue([{ name: "Tractor", price: 500 }]);
    const req = { query: { q: "Tractor", min_price: 100, max_price: 1000 } };
    const res = mockRes();
    await equipmentController.searchEquipment(req, res);
    expect(Equipment.aggregate).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ pagination: expect.objectContaining({ totalItems: 1 }) })
    );
  });

  test("handles date availability in search", async () => {
    Rental.aggregate.mockResolvedValue([{ _id: "eq1", totalRented: 5 }]);
    Equipment.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([{ _id: "eq1", quantity: 5 }, { _id: "eq2", quantity: 10 }]),
    });
    Equipment.countDocuments.mockResolvedValue(1);
    Equipment.aggregate.mockResolvedValue([{ name: "Safe Item" }]);

    const req = { query: { start_date: "2026-06-01", end_date: "2026-06-05" } };
    const res = mockRes();
    await equipmentController.searchEquipment(req, res);
    
    // eq1 should be excluded because it's fully rented (5/5)
    const aggregateMatch = Equipment.aggregate.mock.calls[0][0][0].$match;
    expect(aggregateMatch._id.$nin).toContain("eq1");
  });
});

describe("equipmentController.getEquipmentById", () => {
  test("404 if equipment not found", async () => {
    Equipment.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });
    const req = { params: { id: "invalid" } };
    const res = mockRes();
    await equipmentController.getEquipmentById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("returns formatted equipment with avg_rating", async () => {
    const mockEq = {
      _id: "eq1",
      name: "Cam",
      reviews: [{ rating: 5 }, { rating: 3 }],
      vendor_id: { _id: "v1", shop_name: "Shop" },
    };
    Equipment.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockEq),
    });
    const req = { params: { id: "eq1" } };
    const res = mockRes();
    await equipmentController.getEquipmentById(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ avg_rating: 4 })
    );
  });
});

describe("equipmentController.getEquipmentAvailability", () => {
  test("calculates availability correctly", async () => {
    Equipment.findById.mockResolvedValue({ _id: "eq1", quantity: 10 });
    Rental.aggregate.mockResolvedValue([{ totalRented: 4 }]);
    const req = { params: { id: "eq1" }, query: { start_date: "2026-01-01", end_date: "2026-01-02" } };
    const res = mockRes();
    await equipmentController.getEquipmentAvailability(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, available: 6, total: 10 });
  });
});

describe("equipmentController.bulkUpload", () => {
  test("400 if items array is missing", async () => {
    const req = { body: {} };
    const res = mockRes();
    await equipmentController.bulkUpload(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("processes valid and skips invalid items", async () => {
    Equipment.insertMany.mockResolvedValue([{ name: "Valid" }]);
    const req = {
      user: { id: "u1" },
      body: {
        items: [
          { name: "Valid", price: 100, category: "C", city: "X", quantity: 5 },
          { name: "Invalid", price: -10 }, // invalid price
        ],
      },
    };
    const res = mockRes();
    await equipmentController.bulkUpload(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        inserted: 1,
        skipped_count: 1,
      })
    );
  });
});
