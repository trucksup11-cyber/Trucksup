const { db } = require("../config/db");

const CITY_COORDINATES = {
  indore: { lat: 22.7196, lng: 75.8577 },
  bhopal: { lat: 23.2599, lng: 77.4126 },
  pune: { lat: 18.5204, lng: 73.8567 },
  mumbai: { lat: 19.076, lng: 72.8777 },
  delhi: { lat: 28.6139, lng: 77.209 },
  jaipur: { lat: 26.9124, lng: 75.7873 }
};

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every((value) => Number.isFinite(Number(value)))) {
    return null;
  }

  const dLat = toRadians(Number(lat2) - Number(lat1));
  const dLon = toRadians(Number(lon2) - Number(lon1));
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(Number(lat1))) * Math.cos(toRadians(Number(lat2))) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return 6371 * c;
}

function getNearestCity(latitude, longitude) {
  if (![latitude, longitude].every((value) => Number.isFinite(Number(value)))) {
    return null;
  }

  const nearest = Object.entries(CITY_COORDINATES)
    .map(([city, coords]) => ({
      city,
      distanceKm: haversineDistanceKm(latitude, longitude, coords.lat, coords.lng)
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];

  if (!nearest || nearest.distanceKm > 100) {
    return null;
  }

  return nearest.city.charAt(0).toUpperCase() + nearest.city.slice(1);
}

function mapTruck(truck) {
  return {
    id: truck.id,
    driver: truck.driver,
    truckNumber: truck.truck_number,
    capacity: truck.capacity,
    status: truck.status,
    latitude: truck.latitude,
    longitude: truck.longitude,
    driverPhone: truck.driver_phone,
    driverAvatarUrl: truck.driver_avatar_url,
    driverUserId: truck.driver_user_id,
    lastLocationAt: truck.last_location_at,
    currentLoadId: truck.current_load_id,
    createdAt: truck.created_at,
    currentCity: getNearestCity(truck.latitude, truck.longitude)
  };
}

function getDriverProfile(userId) {
  return db
    .prepare(`
      SELECT id, full_name, email, phone, profile_photo_url
      FROM users
      WHERE id = ?
    `)
    .get(userId);
}

const getTrucks = async (req, res) => {
  try {
    const showMineOnly = req.user?.role === "driver" || req.query.mine === "1";
    const params = [];
    let whereClause = "";

    if (showMineOnly && req.user?.id) {
      whereClause = "WHERE driver_user_id = ?";
      params.push(req.user.id);
    }

    const trucks = db
      .prepare(`
        SELECT
          id,
          driver,
          truck_number,
          capacity,
          status,
          latitude,
          longitude,
          driver_phone,
          driver_avatar_url,
          driver_user_id,
          last_location_at,
          current_load_id,
          created_at
        FROM trucks
        ${whereClause}
        ORDER BY id DESC
      `)
      .all(...params);

    res.json(trucks.map(mapTruck));
  } catch (error) {
    console.error("GET TRUCKS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch trucks." });
  }
};

const addTruck = async (req, res) => {
  try {
    const { driver, truck_number, capacity, status, latitude, longitude, driver_phone, driver_avatar_url, driver_user_id } = req.body;
    let resolvedDriver = driver;
    let resolvedDriverPhone = driver_phone;
    let resolvedDriverUserId = driver_user_id ? Number(driver_user_id) : null;

    if (req.user?.role === "driver") {
      const driverProfile = getDriverProfile(req.user.id);
      resolvedDriver = driverProfile?.full_name || req.user.email || "Driver";
      resolvedDriverPhone = driverProfile?.phone || driver_phone || null;
      resolvedDriverUserId = req.user.id;
      req.body.driver_avatar_url = driverProfile?.profile_photo_url || driver_avatar_url || null;
    }

    if (!resolvedDriver || !truck_number || !capacity) {
      return res.status(400).json({ message: "Driver, truck number, and capacity are required." });
    }

    const result = db
      .prepare(`
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
      `)
      .run(
        resolvedDriver.trim(),
        truck_number.trim().toUpperCase(),
        Number(capacity),
        status || "Available",
        latitude ? Number(latitude) : 22.7196,
        longitude ? Number(longitude) : 75.8577,
        resolvedDriverPhone?.trim() || null,
        req.body.driver_avatar_url?.trim() || driver_avatar_url?.trim() || null,
        resolvedDriverUserId,
        new Date().toISOString()
      );

    const truck = db
      .prepare(`
        SELECT
          id,
          driver,
          truck_number,
          capacity,
          status,
          latitude,
          longitude,
          driver_phone,
          driver_avatar_url,
          driver_user_id,
          last_location_at,
          current_load_id,
          created_at
        FROM trucks
        WHERE id = ?
      `)
      .get(Number(result.lastInsertRowid));

    res.status(201).json({
      message: "Truck added successfully.",
      truck: mapTruck(truck)
    });
  } catch (error) {
    console.error("ADD TRUCK ERROR:", error);

    if (String(error.message).includes("UNIQUE")) {
      return res.status(409).json({ message: "Truck number already exists." });
    }

    res.status(500).json({ message: "Failed to add truck." });
  }
};

const deleteTruck = async (req, res) => {
  try {
    const truckId = Number(req.params.id);
    const existingTruck = db
      .prepare("SELECT id, driver_user_id FROM trucks WHERE id = ?")
      .get(truckId);

    if (!existingTruck) {
      return res.status(404).json({ message: "Truck not found." });
    }

    if (req.user?.role === "driver" && existingTruck.driver_user_id !== req.user.id) {
      return res.status(403).json({ message: "You can only delete your own trucks." });
    }

    const result = db.prepare("DELETE FROM trucks WHERE id = ?").run(truckId);

    if (!result.changes) {
      return res.status(404).json({ message: "Truck not found." });
    }

    res.json({ message: "Truck deleted successfully." });
  } catch (error) {
    console.error("DELETE TRUCK ERROR:", error);
    res.status(500).json({ message: "Failed to delete truck." });
  }
};

const updateTruck = async (req, res) => {
  try {
    const { driver, truck_number, capacity, status, latitude, longitude, driver_phone, driver_avatar_url, driver_user_id } = req.body;
    const truckId = Number(req.params.id);
    let resolvedDriver = driver;
    let resolvedDriverPhone = driver_phone;
    let resolvedDriverUserId = driver_user_id ? Number(driver_user_id) : null;

    const existingTruck = db
      .prepare("SELECT id, driver_user_id FROM trucks WHERE id = ?")
      .get(truckId);

    if (!existingTruck) {
      return res.status(404).json({ message: "Truck not found." });
    }

    if (req.user?.role === "driver" && existingTruck.driver_user_id !== req.user.id) {
      return res.status(403).json({ message: "You can only update your own trucks." });
    }

    if (req.user?.role === "driver") {
      const driverProfile = getDriverProfile(req.user.id);
      resolvedDriver = driverProfile?.full_name || req.user.email || "Driver";
      resolvedDriverPhone = driverProfile?.phone || driver_phone || null;
      resolvedDriverUserId = req.user.id;
      req.body.driver_avatar_url = driverProfile?.profile_photo_url || driver_avatar_url || null;
    }

    db.prepare(`
      UPDATE trucks
      SET
        driver = ?,
        truck_number = ?,
        capacity = ?,
        status = ?,
        latitude = ?,
        longitude = ?,
        driver_phone = ?,
        driver_avatar_url = ?,
        driver_user_id = ?,
        last_location_at = ?
      WHERE id = ?
    `).run(
      resolvedDriver.trim(),
      truck_number.trim().toUpperCase(),
      Number(capacity),
      status,
      Number(latitude),
      Number(longitude),
      resolvedDriverPhone?.trim() || null,
      req.body.driver_avatar_url?.trim() || driver_avatar_url?.trim() || null,
      resolvedDriverUserId,
      new Date().toISOString(),
      truckId
    );

    const updatedTruck = db
      .prepare(`
        SELECT
          id,
          driver,
          truck_number,
          capacity,
          status,
          latitude,
          longitude,
          driver_phone,
          driver_avatar_url,
          driver_user_id,
          last_location_at,
          current_load_id,
          created_at
        FROM trucks
        WHERE id = ?
      `)
      .get(truckId);

    res.json({
      message: "Truck updated successfully.",
      truck: mapTruck(updatedTruck)
    });
  } catch (error) {
    console.error("UPDATE TRUCK ERROR:", error);

    if (String(error.message).includes("UNIQUE")) {
      return res.status(409).json({ message: "Truck number already exists." });
    }

    res.status(500).json({ message: "Failed to update truck." });
  }
};

const getMyTruck = async (req, res) => {
  try {
    if (req.user?.role !== "driver") {
      return res.status(403).json({ message: "Only drivers can access this endpoint." });
    }

    const truck = db
      .prepare(`
        SELECT
          id,
          driver,
          truck_number,
          capacity,
          status,
          latitude,
          longitude,
          driver_phone,
          driver_avatar_url,
          driver_user_id,
          last_location_at,
          current_load_id,
          created_at
        FROM trucks
        WHERE driver_user_id = ?
        ORDER BY id ASC
        LIMIT 1
      `)
      .get(req.user.id);

    if (!truck) {
      return res.status(404).json({ message: "No truck assigned to this driver yet." });
    }

    return res.json(mapTruck(truck));
  } catch (error) {
    console.error("GET MY TRUCK ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch driver truck." });
  }
};

const updateMyLocation = async (req, res) => {
  try {
    if (req.user?.role !== "driver") {
      return res.status(403).json({ message: "Only drivers can update location." });
    }

    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ message: "Valid latitude and longitude are required." });
    }

    const truck = db
      .prepare(`
        SELECT id, driver, truck_number, status, current_load_id
        FROM trucks
        WHERE driver_user_id = ?
        ORDER BY id ASC
        LIMIT 1
      `)
      .get(req.user.id);

    if (!truck) {
      return res.status(404).json({ message: "No truck assigned to this driver." });
    }

    db.prepare(`
      UPDATE trucks
      SET latitude = ?, longitude = ?, last_location_at = ?
      WHERE id = ?
    `).run(latitude, longitude, new Date().toISOString(), truck.id);

    const updatedTruck = db
      .prepare(`
        SELECT
          id,
          driver,
          truck_number,
          capacity,
          status,
          latitude,
          longitude,
          driver_phone,
          driver_avatar_url,
          driver_user_id,
          last_location_at,
          current_load_id,
          created_at
        FROM trucks
        WHERE id = ?
      `)
      .get(truck.id);

    const io = req.app.get("io");
    if (io) {
      io.to("admins").emit("truck_location_updated", {
        truck: mapTruck(updatedTruck)
      });

      if (updatedTruck.current_load_id) {
        io.emit("load_truck_location_updated", {
          loadId: updatedTruck.current_load_id,
          truck: mapTruck(updatedTruck)
        });
      }
    }

    return res.json({
      message: "Location updated.",
      truck: mapTruck(updatedTruck)
    });
  } catch (error) {
    console.error("UPDATE MY LOCATION ERROR:", error);
    return res.status(500).json({ message: "Failed to update location." });
  }
};

module.exports = {
  getTrucks,
  addTruck,
  deleteTruck,
  updateTruck,
  getMyTruck,
  updateMyLocation
};
