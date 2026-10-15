const express = require("express");
const { auth, requireRoles } = require("../middleware/auth");
const {
  create,
  mine,
  pending,
  getOne,
  updateStatus,
} = require("../controllers/emergencyController");

const router = express.Router();

router.use(auth);

router.post("/", requireRoles("patient"), create);
router.get("/mine", mine);
router.get("/pending", requireRoles("driver", "dispatcher"), pending);
router.get("/:id", getOne);
router.patch("/:id/status", requireRoles("driver", "dispatcher"), updateStatus);

module.exports = router;
