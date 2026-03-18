const express = require("express");
const router = express.Router();
const { getNotifications, syncNotifications, markViewed } = require("../controllers/notification.controller");

router.get("/", getNotifications);
router.get("/sync", syncNotifications);
router.patch("/viewed", markViewed);

module.exports = router;
