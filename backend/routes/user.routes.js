const express = require("express");
const {
  requireRole,
  authenticateToken,
} = require("../middleware/auth.middleware");
const {
  getProfile,
  getAllUsers,
  updateUser,
  deleteUser,
  resetUserPassword,
} = require("../controllers/user.controller");

const router = express.Router();

router.get("/profile/:id", authenticateToken, getProfile);
router.get("/profile", authenticateToken, getProfile);
router.get("/", requireRole("admin"), getAllUsers);
router.patch("/:id", authenticateToken, updateUser);
router.delete("/:id", requireRole("admin"), deleteUser);
router.post("/:id/change-password", requireRole("admin"), resetUserPassword);

module.exports = router;
