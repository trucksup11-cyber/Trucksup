const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
  getLoads,
  getNearbyLoads,
  addLoad,
  updateLoad,
  deleteLoad,
  updateLoadStatus
} = require("../controllers/loadController");

router.get("/", getLoads);
router.get("/nearby", auth, getNearbyLoads);
router.post("/", auth, addLoad);
router.put("/:id", auth, updateLoad);
router.delete("/:id", auth, deleteLoad);
router.patch("/:id/status", auth, updateLoadStatus);

module.exports = router;
