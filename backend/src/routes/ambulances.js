const express = require("express");
const { auth, requireRoles } = require("../middleware/auth");
const {
  updateMyStatus,
  updateMyLocation,
  nearby,
  listAll,
} = require("../controllers/ambulanceController");

const router = express.Router();

router.use(auth);

router.get("/nearby", nearby);
router.get("/", requireRoles("dispatcher"), listAll);
router.patch("/me/status", requireRoles("driver"), updateMyStatus);
router.patch("/me/location", requireRoles("driver"), updateMyLocation);

module.exports = router;
