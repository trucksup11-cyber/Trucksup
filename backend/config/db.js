const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { DatabaseSync } = require("node:sqlite");

const dataDir = path.join(__dirname, "..", "data");
const databasePath = path.join(dataDir, "trucks-up.sqlite");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(databasePath);
const DEFAULT_PROFILE_IMAGE = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

function hasColumn(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((column) => column.name === columnName);
}

function ensureColumn(tableName, columnName, definition) {
  if (!hasColumn(tableName, columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function initializeDatabase() {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      full_name TEXT,
      phone TEXT,
      profile_photo_url TEXT NOT NULL DEFAULT '${DEFAULT_PROFILE_IMAGE}',
      aadhar_id TEXT,
      license_id TEXT,
      aadhar_file_url TEXT,
      license_file_url TEXT,
      preferred_language TEXT NOT NULL DEFAULT 'en',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS loads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pickup TEXT NOT NULL,
      drop_location TEXT NOT NULL,
      pickup_latitude REAL,
      pickup_longitude REAL,
      drop_latitude REAL,
      drop_longitude REAL,
      shipment_name TEXT,
      shipment_phone TEXT,
      shipment_address TEXT,
      reference_number TEXT,
      dispatch_radius_km REAL NOT NULL DEFAULT 12,
      weight REAL NOT NULL,
      price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Available',
      assigned_to INTEGER,
      accepted_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS trucks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      driver TEXT NOT NULL,
      truck_number TEXT NOT NULL UNIQUE,
      capacity REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Available',
      latitude REAL NOT NULL DEFAULT 22.7196,
      longitude REAL NOT NULL DEFAULT 75.8577,
      driver_phone TEXT,
      driver_avatar_url TEXT,
      driver_user_id INTEGER,
      last_location_at TEXT,
      current_load_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (driver_user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (current_load_id) REFERENCES loads(id) ON DELETE SET NULL
    );
  `);

  ensureColumn("users", "full_name", "TEXT");
  ensureColumn("users", "phone", "TEXT");
  ensureColumn("users", "profile_photo_url", `TEXT NOT NULL DEFAULT '${DEFAULT_PROFILE_IMAGE}'`);
  ensureColumn("users", "aadhar_id", "TEXT");
  ensureColumn("users", "license_id", "TEXT");
  ensureColumn("users", "aadhar_file_url", "TEXT");
  ensureColumn("users", "license_file_url", "TEXT");
  ensureColumn("users", "preferred_language", "TEXT NOT NULL DEFAULT 'en'");

  ensureColumn("loads", "pickup_latitude", "REAL");
  ensureColumn("loads", "pickup_longitude", "REAL");
  ensureColumn("loads", "drop_latitude", "REAL");
  ensureColumn("loads", "drop_longitude", "REAL");
  ensureColumn("loads", "shipment_name", "TEXT");
  ensureColumn("loads", "shipment_phone", "TEXT");
  ensureColumn("loads", "shipment_address", "TEXT");
  ensureColumn("loads", "reference_number", "TEXT");
  ensureColumn("loads", "dispatch_radius_km", "REAL NOT NULL DEFAULT 12");
  ensureColumn("loads", "accepted_at", "TEXT");

  ensureColumn("trucks", "driver_phone", "TEXT");
  ensureColumn("trucks", "driver_avatar_url", "TEXT");
  ensureColumn("trucks", "driver_user_id", "INTEGER");
  ensureColumn("trucks", "last_location_at", "TEXT");

  seedUsers();
  seedLoads();
  seedTrucks();
  backfillLegacyData();
}

function seedUsers() {
  const userCount = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;

  if (userCount > 0) {
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL || "admin@trucksup.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const driverEmail = process.env.DRIVER_EMAIL || "driver@trucksup.local";
  const driverPassword = process.env.DRIVER_PASSWORD || "driver123";

  const insertUser = db.prepare(`
    INSERT INTO users (email, password, role, full_name, phone, profile_photo_url, preferred_language)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(
    adminEmail,
    bcrypt.hashSync(adminPassword, 10),
    "admin",
    "Dispatch Admin",
    "+91-9000000001",
    DEFAULT_PROFILE_IMAGE,
    "en"
  );
  insertUser.run(
    driverEmail,
    bcrypt.hashSync(driverPassword, 10),
    "driver",
    "Rakesh Yadav",
    "+91-9000000002",
    DEFAULT_PROFILE_IMAGE,
    "en"
  );
}

function seedLoads() {
  const loadCount = db.prepare("SELECT COUNT(*) AS count FROM loads").get().count;

  if (loadCount > 0) {
    return;
  }

  const insertLoad = db.prepare(`
    INSERT INTO loads (
      pickup,
      drop_location,
      pickup_latitude,
      pickup_longitude,
      drop_latitude,
      drop_longitude,
      shipment_name,
      shipment_phone,
      shipment_address,
      reference_number,
      dispatch_radius_km,
      weight,
      price,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  [
    ["Indore", "Bhopal", 22.7196, 75.8577, 23.2599, 77.4126, "Agarwal Textiles", "+91-9898989891", "Vijay Nagar, Indore", "LD-1001", 12, 8.5, 22000, "Available"],
    ["Pune", "Mumbai", 18.5204, 73.8567, 19.076, 72.8777, "Sharma Steel", "+91-9898989892", "Hinjewadi, Pune", "LD-1002", 10, 4.2, 16500, "Available"],
    ["Delhi", "Jaipur", 28.6139, 77.209, 26.9124, 75.7873, "Singh Traders", "+91-9898989893", "Karol Bagh, Delhi", "LD-1003", 15, 10, 31500, "In Order"]
  ].forEach((load) => insertLoad.run(...load));
}

function seedTrucks() {
  const truckCount = db.prepare("SELECT COUNT(*) AS count FROM trucks").get().count;

  if (truckCount > 0) {
    return;
  }

  const driverUser = db
    .prepare("SELECT id FROM users WHERE role = 'driver' ORDER BY id ASC LIMIT 1")
    .get();

  const insertTruck = db.prepare(`
    INSERT INTO trucks (
      driver,
      truck_number,
      capacity,
      status,
      latitude,
      longitude,
      driver_phone,
      driver_avatar_url,
      driver_user_id,
      last_location_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  [
    ["Rakesh Yadav", "MP09-TR-1024", 12, "Available", 22.7196, 75.8577, "+91-9000000002", null, driverUser?.id || null, new Date().toISOString()],
    ["Aman Verma", "MH12-TR-8801", 8, "On Delivery", 18.5204, 73.8567, "+91-9000000005", null, null, new Date().toISOString()],
    ["Suresh Singh", "DL01-TR-2210", 15, "Maintenance", 28.6139, 77.209, "+91-9000000006", null, null, new Date().toISOString()]
  ].forEach((truck) => insertTruck.run(...truck));
}

function backfillLegacyData() {
  const cityCoordinates = {
    indore: { lat: 22.7196, lng: 75.8577 },
    bhopal: { lat: 23.2599, lng: 77.4126 },
    pune: { lat: 18.5204, lng: 73.8567 },
    mumbai: { lat: 19.076, lng: 72.8777 },
    delhi: { lat: 28.6139, lng: 77.209 },
    jaipur: { lat: 26.9124, lng: 75.7873 }
  };

  const driverUser = db
    .prepare("SELECT id, phone, profile_photo_url FROM users WHERE role = 'driver' ORDER BY id ASC LIMIT 1")
    .get();
  if (driverUser) {
    db.prepare(`
      UPDATE trucks
      SET
        driver_user_id = COALESCE(driver_user_id, ?),
        driver_phone = COALESCE(driver_phone, ?),
        driver_avatar_url = COALESCE(driver_avatar_url, ?),
        last_location_at = COALESCE(last_location_at, ?)
      WHERE id = (SELECT id FROM trucks ORDER BY id ASC LIMIT 1)
    `).run(
      driverUser.id,
      driverUser.phone || null,
      driverUser.profile_photo_url || DEFAULT_PROFILE_IMAGE,
      new Date().toISOString()
    );
  }

  const legacyLoads = db
    .prepare(`
      SELECT id, pickup, drop_location, pickup_latitude, pickup_longitude, drop_latitude, drop_longitude, dispatch_radius_km
      FROM loads
      WHERE pickup_latitude IS NULL OR pickup_longitude IS NULL OR dispatch_radius_km IS NULL
    `)
    .all();

  const updateLoadCoords = db.prepare(`
    UPDATE loads
    SET pickup_latitude = ?, pickup_longitude = ?, drop_latitude = ?, drop_longitude = ?, dispatch_radius_km = ?
    WHERE id = ?
  `);

  legacyLoads.forEach((load) => {
    const pickupCity = String(load.pickup || "").trim().toLowerCase();
    const dropCity = String(load.drop_location || "").trim().toLowerCase();

    const pickup = cityCoordinates[pickupCity] || { lat: 22.7196, lng: 75.8577 };
    const drop = cityCoordinates[dropCity] || { lat: 23.2599, lng: 77.4126 };

    updateLoadCoords.run(
      load.pickup_latitude ?? pickup.lat,
      load.pickup_longitude ?? pickup.lng,
      load.drop_latitude ?? drop.lat,
      load.drop_longitude ?? drop.lng,
      load.dispatch_radius_km ?? 12,
      load.id
    );
  });
}

module.exports = {
  db,
  initializeDatabase,
  databasePath
};
