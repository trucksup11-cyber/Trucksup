const express = require("express");

const auth = require("../middleware/authMiddleware");
const {
  getTrucks,
  addTruck,
  deleteTruck,
  updateTruck,
  getMyTruck,
  updateMyLocation
} = require("../controllers/truckController");

const router = express.Router();

router.get("/", getTrucks);
router.get("/me", auth, getMyTruck);
router.patch("/me/location", auth, updateMyLocation);
router.post("/", auth, addTruck);
router.delete("/:id", auth, deleteTruck);
router.put("/:id", auth, updateTruck);

module.exports = router;
