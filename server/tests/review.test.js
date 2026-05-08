/**
 * tests/review.test.js — Unit tests for controllers/reviewController.js
 * All Mongoose models are mocked. No real DB connection needed.
 */

jest.mock("../models/Equipment");
jest.mock("../models/Rental");
jest.mock("../utils/logger", () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

const reviewController = require("../controllers/reviewController");
const Equipment        = require("../models/Equipment");
const Rental           = require("../models/Rental");

const mockRes  = () => { const r = {}; r.status = jest.fn().mockReturnValue(r); r.json = jest.fn().mockReturnValue(r); return r; };
const mockNext = jest.fn();

// ── GET REVIEWS ───────────────────────────────────────────────────────────────
describe("reviewController.getReviews", () => {
  test("404 when equipment ID does not exist", async () => {
    Equipment.findById = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
    const res = mockRes();
    await reviewController.getReviews({ params: { id: "bad_id" } }, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Equipment not found" }));
  });

  test("200 with null avg_rating when equipment has no reviews", async () => {
    const fakeEq = { reviews: [] };
    Equipment.findById = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(fakeEq) });
    const res = mockRes();
    await reviewController.getReviews({ params: { id: "eq1" } }, res, mockNext);
    const result = res.json.mock.calls[0][0];
    expect(result.success).toBe(true);
    expect(result.avg_rating).toBeNull();
    expect(result.review_count).toBe(0);
    expect(result.data).toHaveLength(0);
  });

  test("200 — calculates correct average rating from multiple reviews", async () => {
    const fakeEq = {
      reviews: [
        { _id: "rv1", rating: 4, comment: "Good", user_id: { name: "Arjun" }, createdAt: new Date() },
        { _id: "rv2", rating: 5, comment: "Great", user_id: { name: "Priya" }, createdAt: new Date() },
        { _id: "rv3", rating: 3, comment: "Okay",  user_id: null,             createdAt: new Date() },
      ],
    };
    Equipment.findById = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(fakeEq) });
    const res = mockRes();
    await reviewController.getReviews({ params: { id: "eq1" } }, res, mockNext);
    const result = res.json.mock.calls[0][0];
    expect(result.success).toBe(true);
    expect(result.avg_rating).toBe(4.0);        // (4+5+3)/3 = 4.0
    expect(result.review_count).toBe(3);
  });

  test("200 — reviewer with null user_id is labelled Anonymous", async () => {
    const fakeEq = {
      reviews: [
        { _id: "rv1", rating: 5, comment: "Nice", user_id: null, createdAt: new Date() },
      ],
    };
    Equipment.findById = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(fakeEq) });
    const res = mockRes();
    await reviewController.getReviews({ params: { id: "eq1" } }, res, mockNext);
    expect(res.json.mock.calls[0][0].data[0].user_name).toBe("Anonymous");
  });

  test("calls next(error) on DB failure", async () => {
    Equipment.findById = jest.fn().mockReturnValue({ populate: jest.fn().mockRejectedValue(new Error("DB fail")) });
    const next = jest.fn();
    await reviewController.getReviews({ params: { id: "eq1" } }, mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ── ADD REVIEW ────────────────────────────────────────────────────────────────
describe("reviewController.addReview", () => {
  const userReq = (body) => ({ user: { id: "user1" }, body });

  test("400 when equipment_id is missing", async () => {
    const res = mockRes();
    await reviewController.addReview(userReq({ rating: 4 }), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test("400 when rating is missing", async () => {
    const res = mockRes();
    await reviewController.addReview(userReq({ equipment_id: "eq1" }), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("400 when rating is 0 (treated as missing by the controller)", async () => {
    // rating:0 is falsy in JS — controller hits the !rating guard and returns "required"
    const res = mockRes();
    await reviewController.addReview(userReq({ equipment_id: "eq1", rating: 0 }), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "equipment_id and rating are required." })
    );
  });

  test("400 when rating is explicitly negative (e.g. -1)", async () => {
    Equipment.findById = jest.fn().mockResolvedValue({ _id: "eq1", reviews: [] });
    Rental.findOne     = jest.fn().mockResolvedValue({ _id: "r1" });
    const res = mockRes();
    await reviewController.addReview(userReq({ equipment_id: "eq1", rating: -1 }), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Rating must be between 1 and 5." }));
  });

  test("400 when rating is above 5", async () => {
    const res = mockRes();
    await reviewController.addReview(userReq({ equipment_id: "eq1", rating: 6 }), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Rating must be between 1 and 5." }));
  });

  test("404 when equipment does not exist", async () => {
    Equipment.findById = jest.fn().mockResolvedValue(null);
    const res = mockRes();
    await reviewController.addReview(userReq({ equipment_id: "bad_id", rating: 4 }), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: "Equipment not found." }));
  });

  test("403 when user has not completed a rental for this equipment", async () => {
    Equipment.findById = jest.fn().mockResolvedValue({ _id: "eq1", reviews: [] });
    Rental.findOne     = jest.fn().mockResolvedValue(null); // no completed rental
    const res = mockRes();
    await reviewController.addReview(userReq({ equipment_id: "eq1", rating: 4 }), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("only review equipment you have rented") })
    );
  });

  test("200 — existing review is updated and saved", async () => {
    const fakeEq = {
      _id: "eq1",
      reviews: [{ user_id: "user1", rating: 1, comment: "old" }], // user_id as string for simple comparison in test mock
      save: jest.fn().mockResolvedValue(true),
    };
    // Mock the toString for comparison if needed, but since we use string in the mock array it should match
    Equipment.findById = jest.fn().mockResolvedValue(fakeEq);
    Rental.findOne = jest.fn().mockResolvedValue({ _id: "rental1" });
    const res = mockRes();
    await reviewController.addReview(userReq({ equipment_id: "eq1", rating: 5 }), res, mockNext);
    
    expect(fakeEq.reviews[0].rating).toBe(5);
    expect(fakeEq.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Review added successfully." })
    );
  });

  test("200 — valid review is pushed and saved", async () => {
    const fakeEq = {
      _id: "eq1",
      reviews: [],
      push: undefined,          // will be overwritten
      save: jest.fn().mockResolvedValue(true),
    };
    // reviews.push is an Array method — mock the array properly
    fakeEq.reviews.push = jest.fn();
    Equipment.findById = jest.fn().mockResolvedValue(fakeEq);
    Rental.findOne     = jest.fn().mockResolvedValue({ _id: "rental1" });

    const res = mockRes();
    await reviewController.addReview(userReq({ equipment_id: "eq1", rating: 5, review: "Excellent!" }), res, mockNext);

    expect(fakeEq.reviews.push).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user1", rating: 5, comment: "Excellent!" })
    );
    expect(fakeEq.save).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "Review added successfully." }));
  });

  test("200 — review without a comment defaults to empty string", async () => {
    const fakeEq = { _id: "eq1", reviews: [], save: jest.fn().mockResolvedValue(true) };
    fakeEq.reviews.push = jest.fn();
    Equipment.findById = jest.fn().mockResolvedValue(fakeEq);
    Rental.findOne     = jest.fn().mockResolvedValue({ _id: "r1" });

    const res = mockRes();
    await reviewController.addReview(userReq({ equipment_id: "eq1", rating: 3 }), res, mockNext);
    expect(fakeEq.reviews.push).toHaveBeenCalledWith(
      expect.objectContaining({ comment: "" })
    );
  });

  test("calls next(error) on unexpected DB error", async () => {
    Equipment.findById = jest.fn().mockRejectedValue(new Error("Unexpected"));
    const next = jest.fn();
    await reviewController.addReview(userReq({ equipment_id: "eq1", rating: 4 }), mockRes(), next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
