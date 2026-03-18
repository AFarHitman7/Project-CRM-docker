const express = require("express");
const router = express.Router();
const { getNotifications, syncNotifications, markViewed } = require("../controllers/notification.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

router.get("/", authenticateToken, getNotifications);
router.get("/sync", authenticateToken, syncNotifications);
router.patch("/viewed", authenticateToken, markViewed);

module.exports = router;
