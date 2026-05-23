const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const { login, register, updateLanguage } = require("../controllers/authController");

router.post("/login", login);
router.post("/register", register);
router.patch("/language", auth, updateLanguage);

module.exports = router;
