const express = require("express");
const { authenticateToken } = require("../middleware/auth.middleware");
const {
  getDashboardCounts,
  getStatusCounts,
  getBirthday,
} = require("../controllers/dashboard.controller");

const router = express.Router();

router.get("/counts", authenticateToken, getDashboardCounts);
router.get("/status-counts", authenticateToken, getStatusCounts);
router.get("/birthday", authenticateToken, getBirthday);

module.exports = router;
