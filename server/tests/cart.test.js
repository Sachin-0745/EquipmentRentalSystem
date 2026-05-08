/**
 * tests/cart.test.js
 * Unit tests for controllers/cartController.js
 */

jest.mock("../models/Cart");
jest.mock("../models/Equipment");

const cartController = require("../controllers/cartController");
const Cart = require("../models/Cart");
const Equipment = require("../models/Equipment");
const mongoose = require("mongoose");

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("cartController.getCart", () => {
  test("returns formatted cart items", async () => {
    const mockItems = [{
      _id: "c1",
      quantity: 2,
      start_date: "2026-01-01",
      end_date: "2026-01-02",
      equipment_id: { _id: "eq1", name: "Drill", price: 50, quantity: 10 }
    }];
    Cart.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockItems),
    });
    const req = { user: { id: "u1" } };
    const res = mockRes();
    await cartController.getCart(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.arrayContaining([
        expect.objectContaining({ name: "Drill", cart_quantity: 2 })
      ])
    }));
  });
});

describe("cartController.addToCart", () => {
  test("400 if equipment ID is invalid", async () => {
    const req = { body: { equipment_id: "invalid" } };
    const res = mockRes();
    await cartController.addToCart(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("400 if requested quantity exceeds stock", async () => {
    const eqId = new mongoose.Types.ObjectId();
    Equipment.findById.mockResolvedValue({ _id: eqId, quantity: 2 });
    const req = {
      user: { id: "u1" },
      body: { equipment_id: eqId.toString(), quantity: 5, start_date: "2026-01-01", end_date: "2026-01-02" }
    };
    const res = mockRes();
    await cartController.addToCart(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Not enough stock available" }));
  });

  test("creates new cart item if it doesn't exist", async () => {
    const eqId = new mongoose.Types.ObjectId();
    Equipment.findById.mockResolvedValue({ _id: eqId, quantity: 10 });
    Cart.findOne.mockResolvedValue(null);
    Cart.create.mockResolvedValue({});
    
    const req = {
      user: { id: "u1" },
      body: { equipment_id: eqId.toString(), quantity: 1, start_date: "2026-01-01", end_date: "2026-01-02" }
    };
    const res = mockRes();
    await cartController.addToCart(req, res);
    expect(Cart.create).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: "Added to cart" });
  });
});
