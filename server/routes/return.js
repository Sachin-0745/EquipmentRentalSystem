const express = require("express");
const router = express.Router();
const returnController = require("../controllers/returnController");
const { auth: authMiddleware } = require("../middlewares/auth");

router.use(authMiddleware);

router.put("/verify/:id", returnController.verifyReturn);

module.exports = router;
