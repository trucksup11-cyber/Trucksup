const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { db } = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "trucks-up-local-secret";
const DEFAULT_PROFILE_IMAGE = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

exports.register = async (req, res) => {
  try {
    const {
      email,
      password,
      role = "admin",
      full_name,
      phone,
      profile_photo_url,
      aadhar_id,
      license_id,
      aadhar_file_url,
      license_file_url,
      preferred_language = "en"
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    if (role === "driver" && (!aadhar_id || !license_id || !aadhar_file_url || !license_file_url)) {
      return res.status(400).json({
        message: "Aadhar ID, license ID, Aadhar document, and license document are required for driver registration."
      });
    }

    const existingUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email.trim().toLowerCase());

    if (existingUser) {
      return res.status(409).json({ message: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = db
      .prepare(
        `INSERT INTO users (
          email,
          password,
          role,
          full_name,
          phone,
          profile_photo_url,
          aadhar_id,
          license_id,
          aadhar_file_url,
          license_file_url,
          preferred_language
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        email.trim().toLowerCase(),
        hashedPassword,
        role,
        full_name?.trim() || null,
        phone?.trim() || null,
        profile_photo_url?.trim() || DEFAULT_PROFILE_IMAGE,
        role === "driver" ? aadhar_id.trim() : null,
        role === "driver" ? license_id.trim() : null,
        role === "driver" ? aadhar_file_url.trim() : null,
        role === "driver" ? license_file_url.trim() : null,
        preferred_language
      );

    return res.status(201).json({
      message: "Registered successfully.",
      user: {
        id: Number(result.lastInsertRowid),
        email: email.trim().toLowerCase(),
        role,
        fullName: full_name?.trim() || null,
        phone: phone?.trim() || null,
        profilePhotoUrl: profile_photo_url?.trim() || DEFAULT_PROFILE_IMAGE,
        aadharId: role === "driver" ? aadhar_id.trim() : null,
        licenseId: role === "driver" ? license_id.trim() : null,
        aadharFileUrl: role === "driver" ? aadhar_file_url.trim() : null,
        licenseFileUrl: role === "driver" ? license_file_url.trim() : null,
        preferredLanguage: preferred_language
      }
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.status(500).json({ message: "Failed to register user." });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = db
      .prepare(
        "SELECT id, email, password, role, full_name, phone, profile_photo_url, aadhar_id, license_id, aadhar_file_url, license_file_url, preferred_language FROM users WHERE email = ?"
      )
      .get(email.trim().toLowerCase());

    if (!user) {
      return res.status(400).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password." });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        phone: user.phone,
        profilePhotoUrl: user.profile_photo_url || DEFAULT_PROFILE_IMAGE,
        aadharId: user.aadhar_id,
        licenseId: user.license_id,
        aadharFileUrl: user.aadhar_file_url,
        licenseFileUrl: user.license_file_url,
        preferredLanguage: user.preferred_language || "en"
      }
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

exports.updateLanguage = async (req, res) => {
  try {
    const preferredLanguage = String(req.body?.preferred_language || "").trim();

    if (!preferredLanguage) {
      return res.status(400).json({ message: "Preferred language is required." });
    }

    db.prepare("UPDATE users SET preferred_language = ? WHERE id = ?").run(preferredLanguage, req.user.id);

    const user = db
      .prepare("SELECT id, email, role, full_name, phone, profile_photo_url, aadhar_id, license_id, aadhar_file_url, license_file_url, preferred_language FROM users WHERE id = ?")
      .get(req.user.id);

    return res.json({
      message: "Language updated.",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        phone: user.phone,
        profilePhotoUrl: user.profile_photo_url || DEFAULT_PROFILE_IMAGE,
        aadharId: user.aadhar_id,
        licenseId: user.license_id,
        aadharFileUrl: user.aadhar_file_url,
        licenseFileUrl: user.license_file_url,
        preferredLanguage: user.preferred_language || "en"
      }
    });
  } catch (error) {
    console.error("UPDATE LANGUAGE ERROR:", error);
    return res.status(500).json({ message: "Failed to update language." });
  }
};
