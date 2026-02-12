const express = require("express");
const { authenticateToken } = require("../middleware/auth.middleware");
const {
  getDashboardCounts,
  getStatusCounts,
  getBirthday,
  listBusinessClientsByStatus,
  listPersonalClientsByStatus,
  getUpcomingAnnualRenewals,
} = require("../controllers/dashboard.controller");

const router = express.Router();

router.get("/counts", authenticateToken, getDashboardCounts);
router.get("/status-counts", authenticateToken, getStatusCounts);
router.get("/birthday", authenticateToken, getBirthday);
router.get("/bclient", authenticateToken, listBusinessClientsByStatus);
router.get("/pclient", authenticateToken, listPersonalClientsByStatus);
router.get("/annual", authenticateToken, getUpcomingAnnualRenewals);

module.exports = router;
