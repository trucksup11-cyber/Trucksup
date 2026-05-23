const { db } = require("../config/db");

const DEFAULT_RADIUS_KM = 12;
const AVG_SPEED_KMH = 35;

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
  if (![lat1, lon1, lat2, lon2].every((value) => Number.isFinite(value))) {
    return null;
  }

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return 6371 * c;
}

function cityToCoordinates(city) {
  const key = String(city || "").trim().toLowerCase();
  return CITY_COORDINATES[key] || null;
}

function normalizeCity(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getNearestCity(latitude, longitude) {
  if (![latitude, longitude].every((value) => Number.isFinite(Number(value)))) {
    return null;
  }

  const nearest = Object.entries(CITY_COORDINATES)
    .map(([city, coords]) => ({
      city,
      distanceKm: haversineDistanceKm(Number(latitude), Number(longitude), coords.lat, coords.lng)
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];

  return nearest && nearest.distanceKm <= 100 ? nearest.city : null;
}

function resolveCoordinates(location, latitude, longitude, fallback) {
  if (latitude != null && longitude != null && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
    return { lat: Number(latitude), lng: Number(longitude) };
  }

  const mapped = cityToCoordinates(location);
  if (mapped) {
    return mapped;
  }

  return fallback;
}

function mapAssignedDriver(row) {
  if (!row.driver_user_id) {
    return null;
  }

  return {
    userId: row.driver_user_id,
    name: row.driver_name,
    phone: row.driver_phone,
    email: row.driver_email,
    truckId: row.driver_truck_id,
    truckNumber: row.driver_truck_number,
    status: row.driver_truck_status,
    latitude: row.driver_latitude,
    longitude: row.driver_longitude,
    avatarUrl: row.driver_avatar_url,
    currentCity: row.driver_current_city || getNearestCity(row.driver_latitude, row.driver_longitude)
  };
}

function mapLoad(row) {
  const pickupCity = normalizeCity(row.pickup);
  const dropCity = normalizeCity(row.drop_location);

  return {
    id: row.id,
    pickup: row.pickup,
    pickupCity,
    dropLocation: row.drop_location,
    dropCity,
    pickupLatitude: row.pickup_latitude,
    pickupLongitude: row.pickup_longitude,
    dropLatitude: row.drop_latitude,
    dropLongitude: row.drop_longitude,
    shipmentName: row.shipment_name,
    shipmentPhone: row.shipment_phone,
    shipmentAddress: row.shipment_address,
    referenceNumber: row.reference_number,
    dispatchRadiusKm: row.dispatch_radius_km ?? DEFAULT_RADIUS_KM,
    weight: row.weight,
    price: row.price,
    status: row.status,
    assignedTo: row.assigned_to,
    acceptedAt: row.accepted_at,
    createdAt: row.created_at,
    assignedDriver: mapAssignedDriver(row),
    distanceKm: row.distance_km ?? null,
    etaMinutes: row.eta_minutes ?? null
  };
}

function getLoadsWithDriver() {
  return db
    .prepare(`
      SELECT
        l.id,
        l.pickup,
        l.drop_location,
        l.pickup_latitude,
        l.pickup_longitude,
        l.drop_latitude,
        l.drop_longitude,
        l.shipment_name,
        l.shipment_phone,
        l.shipment_address,
        l.reference_number,
        l.dispatch_radius_km,
        l.weight,
        l.price,
        l.status,
        l.assigned_to,
        l.accepted_at,
        l.created_at,
        u.id AS driver_user_id,
        u.full_name AS driver_name,
        u.email AS driver_email,
        COALESCE(t.driver_phone, u.phone) AS driver_phone,
        t.id AS driver_truck_id,
        t.truck_number AS driver_truck_number,
        t.status AS driver_truck_status,
        t.latitude AS driver_latitude,
        t.longitude AS driver_longitude,
        t.driver_avatar_url AS driver_avatar_url
      FROM loads l
      LEFT JOIN users u ON u.id = l.assigned_to
      LEFT JOIN trucks t ON t.driver_user_id = l.assigned_to
      ORDER BY l.id DESC
    `)
    .all();
}

function getLoadById(loadId) {
  return db
    .prepare(`
      SELECT
        l.id,
        l.pickup,
        l.drop_location,
        l.pickup_latitude,
        l.pickup_longitude,
        l.drop_latitude,
        l.drop_longitude,
        l.shipment_name,
        l.shipment_phone,
        l.shipment_address,
        l.reference_number,
        l.dispatch_radius_km,
        l.weight,
        l.price,
        l.status,
        l.assigned_to,
        l.accepted_at,
        l.created_at,
        u.id AS driver_user_id,
        u.full_name AS driver_name,
        u.email AS driver_email,
        COALESCE(t.driver_phone, u.phone) AS driver_phone,
        t.id AS driver_truck_id,
        t.truck_number AS driver_truck_number,
        t.status AS driver_truck_status,
        t.latitude AS driver_latitude,
        t.longitude AS driver_longitude,
        t.driver_avatar_url AS driver_avatar_url
      FROM loads l
      LEFT JOIN users u ON u.id = l.assigned_to
      LEFT JOIN trucks t ON t.driver_user_id = l.assigned_to
      WHERE l.id = ?
    `)
    .get(loadId);
}

function emitToNearbyDrivers(io, load) {
  const pickupCity = normalizeCity(load.pickupCity || load.pickup);
  if (!io || !pickupCity) {
    return;
  }

  const nearbyDrivers = db
    .prepare(`
      SELECT driver_user_id, latitude, longitude
      FROM trucks
      WHERE
        driver_user_id IS NOT NULL
        AND status = 'Available'
    `)
    .all()
    .filter((truck) => {
      return normalizeCity(getNearestCity(truck.latitude, truck.longitude)) === pickupCity;
    });

  nearbyDrivers.forEach((driver) => {
    io.to(`driver:${driver.driver_user_id}`).emit("new_nearby_load", { load });
  });
}

exports.getLoads = async (_req, res) => {
  try {
    const loads = getLoadsWithDriver();
    res.json(loads.map(mapLoad));
  } catch (error) {
    console.error("GET LOADS ERROR:", error);
    res.status(500).json({ message: "Failed to fetch loads." });
  }
};

exports.getNearbyLoads = async (req, res) => {
  try {
    if (req.user?.role !== "driver") {
      return res.status(403).json({ message: "Only drivers can access nearby loads." });
    }

    const requestedCity = normalizeCity(req.query.city);
    const truck = db
      .prepare(`
        SELECT id, latitude, longitude
        FROM trucks
        WHERE driver_user_id = ?
        ORDER BY id ASC
        LIMIT 1
      `)
      .get(req.user.id);

    if (!truck) {
      return res.status(404).json({ message: "No truck assigned to this driver." });
    }

    const truckCity = getNearestCity(truck.latitude, truck.longitude);

    const loads = getLoadsWithDriver();
    const nearbyLoads = loads
      .map((load) => {
        const distanceKm = haversineDistanceKm(
          Number(truck.latitude),
          Number(truck.longitude),
          Number(load.pickup_latitude),
          Number(load.pickup_longitude)
        );
        const etaMinutes = distanceKm === null ? null : Math.max(1, Math.round((distanceKm / AVG_SPEED_KMH) * 60));

        return {
          ...load,
          distance_km: distanceKm,
          eta_minutes: etaMinutes
        };
      })
      .filter((load) => {
        if (load.assigned_to === req.user.id) {
          return true;
        }

        const loadCity = normalizeCity(load.pickup);
        const effectiveCity = requestedCity || normalizeCity(truckCity);
        const sameRequestedCity = effectiveCity ? loadCity === effectiveCity : true;

        return load.status === "Available" && sameRequestedCity;
      })
      .sort((a, b) => {
        const firstDistance = a.distance_km ?? Number.MAX_SAFE_INTEGER;
        const secondDistance = b.distance_km ?? Number.MAX_SAFE_INTEGER;
        return firstDistance - secondDistance;
      });

    return res.json(nearbyLoads.map(mapLoad));
  } catch (error) {
    console.error("GET NEARBY LOADS ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch nearby loads." });
  }
};

exports.addLoad = async (req, res) => {
  try {
    const {
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
    } = req.body;

    if (!pickup || !drop_location || !weight || !price) {
      return res.status(400).json({
        message: "Pickup, drop location, weight, and price are required."
      });
    }

    const pickupCoordinates = resolveCoordinates(pickup, pickup_latitude, pickup_longitude, {
      lat: 22.7196,
      lng: 75.8577
    });
    const dropCoordinates = resolveCoordinates(drop_location, drop_latitude, drop_longitude, {
      lat: 23.2599,
      lng: 77.4126
    });
    const radiusKm = Number(dispatch_radius_km || DEFAULT_RADIUS_KM);
    const sanitizedRadiusKm = Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : DEFAULT_RADIUS_KM;

    const result = db
      .prepare(`
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
      `)
      .run(
        pickup.trim(),
        drop_location.trim(),
        pickupCoordinates.lat,
        pickupCoordinates.lng,
        dropCoordinates.lat,
        dropCoordinates.lng,
        shipment_name?.trim() || null,
        shipment_phone?.trim() || null,
        shipment_address?.trim() || null,
        reference_number?.trim() || null,
        sanitizedRadiusKm,
        Number(weight),
        Number(price),
        status || "Available"
      );

    const load = db
      .prepare(`
        SELECT
          id,
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
          status,
          assigned_to,
          accepted_at,
          created_at,
          NULL AS driver_user_id,
          NULL AS driver_name,
          NULL AS driver_email,
          NULL AS driver_phone,
          NULL AS driver_truck_id,
          NULL AS driver_truck_number,
          NULL AS driver_truck_status,
          NULL AS driver_latitude,
          NULL AS driver_longitude,
          NULL AS driver_avatar_url
        FROM loads
        WHERE id = ?
      `)
      .get(Number(result.lastInsertRowid));

    const mappedLoad = mapLoad(load);

    const io = req.app.get("io");
    if (io) {
      io.to("admins").emit("load_created", { load: mappedLoad });
      emitToNearbyDrivers(io, mappedLoad);
    }

    res.status(201).json({
      message: "Load added successfully.",
      load: mappedLoad
    });
  } catch (error) {
    console.error("ADD LOAD ERROR:", error);
    res.status(500).json({ message: "Failed to add load." });
  }
};

exports.updateLoad = async (req, res) => {
  try {
    const loadId = Number(req.params.id);
    const existingLoad = db.prepare("SELECT * FROM loads WHERE id = ?").get(loadId);

    if (!existingLoad) {
      return res.status(404).json({ message: "Load not found." });
    }

    const pickup = req.body.pickup?.trim() || existingLoad.pickup;
    const dropLocation = req.body.drop_location?.trim() || existingLoad.drop_location;
    const pickupCoordinates = resolveCoordinates(
      pickup,
      req.body.pickup_latitude ?? existingLoad.pickup_latitude,
      req.body.pickup_longitude ?? existingLoad.pickup_longitude,
      { lat: existingLoad.pickup_latitude, lng: existingLoad.pickup_longitude }
    );
    const dropCoordinates = resolveCoordinates(
      dropLocation,
      req.body.drop_latitude ?? existingLoad.drop_latitude,
      req.body.drop_longitude ?? existingLoad.drop_longitude,
      { lat: existingLoad.drop_latitude, lng: existingLoad.drop_longitude }
    );
    const nextRadius = Number(req.body.dispatch_radius_km ?? existingLoad.dispatch_radius_km ?? DEFAULT_RADIUS_KM);
    const dispatchRadiusKm = Number.isFinite(nextRadius) && nextRadius > 0 ? nextRadius : DEFAULT_RADIUS_KM;

    db.prepare(`
      UPDATE loads
      SET
        pickup = ?,
        drop_location = ?,
        pickup_latitude = ?,
        pickup_longitude = ?,
        drop_latitude = ?,
        drop_longitude = ?,
        shipment_name = ?,
        shipment_phone = ?,
        shipment_address = ?,
        reference_number = ?,
        dispatch_radius_km = ?,
        weight = ?,
        price = ?,
        status = ?
      WHERE id = ?
    `).run(
      pickup,
      dropLocation,
      pickupCoordinates.lat,
      pickupCoordinates.lng,
      dropCoordinates.lat,
      dropCoordinates.lng,
      req.body.shipment_name?.trim() ?? existingLoad.shipment_name,
      req.body.shipment_phone?.trim() ?? existingLoad.shipment_phone,
      req.body.shipment_address?.trim() ?? existingLoad.shipment_address,
      req.body.reference_number?.trim() ?? existingLoad.reference_number,
      dispatchRadiusKm,
      Number(req.body.weight ?? existingLoad.weight),
      Number(req.body.price ?? existingLoad.price),
      req.body.status || existingLoad.status,
      loadId
    );

    const updatedLoad = mapLoad(getLoadById(loadId));
    const io = req.app.get("io");
    if (io) {
      io.to("admins").emit("load_status_updated", { load: updatedLoad });
    }

    return res.json({ message: "Load updated successfully.", load: updatedLoad });
  } catch (error) {
    console.error("UPDATE LOAD DETAIL ERROR:", error);
    return res.status(500).json({ message: "Failed to update load." });
  }
};

exports.deleteLoad = async (req, res) => {
  try {
    const loadId = Number(req.params.id);
    const existingLoad = db.prepare("SELECT id FROM loads WHERE id = ?").get(loadId);
    if (!existingLoad) {
      return res.status(404).json({ message: "Load not found." });
    }

    db.prepare("UPDATE trucks SET current_load_id = NULL, status = 'Available' WHERE current_load_id = ?").run(loadId);
    db.prepare("DELETE FROM loads WHERE id = ?").run(loadId);

    const io = req.app.get("io");
    if (io) {
      io.to("admins").emit("load_deleted", { loadId });
    }

    return res.json({ message: "Load deleted successfully." });
  } catch (error) {
    console.error("DELETE LOAD ERROR:", error);
    return res.status(500).json({ message: "Failed to delete load." });
  }
};

exports.updateLoadStatus = async (req, res) => {
  try {
    const loadId = Number(req.params.id);
    const requestedStatus = req.body.status || "Assigned";

    const existingLoad = db.prepare("SELECT * FROM loads WHERE id = ?").get(loadId);
    if (!existingLoad) {
      return res.status(404).json({ message: "Load not found." });
    }

    const isDriverAccepting = req.user?.role === "driver" && requestedStatus === "Assigned";
    if (isDriverAccepting) {
      if (existingLoad.status !== "Available" && existingLoad.assigned_to !== req.user.id) {
        return res.status(409).json({ message: "This load is already assigned to another driver." });
      }

      const truck = db
        .prepare(`
          SELECT id, latitude, longitude, driver_phone, truck_number, driver
          FROM trucks
          WHERE driver_user_id = ?
          ORDER BY id ASC
          LIMIT 1
        `)
        .get(req.user.id);

      if (!truck) {
        return res.status(404).json({ message: "No truck assigned to this driver." });
      }

      const truckCity = normalizeCity(getNearestCity(truck.latitude, truck.longitude));
      const loadCity = normalizeCity(existingLoad.pickup);

      if (truckCity && loadCity && truckCity !== loadCity) {
        return res.status(403).json({
          message: "This load is not in the same city as the truck."
        });
      }

      db.prepare(`
        UPDATE loads
        SET status = 'Assigned', assigned_to = ?, accepted_at = ?
        WHERE id = ?
      `).run(req.user.id, new Date().toISOString(), loadId);

      db.prepare(`
        UPDATE trucks
        SET status = 'On Delivery', current_load_id = ?
        WHERE id = ?
      `).run(loadId, truck.id);
    } else {
      db.prepare(`
        UPDATE loads
        SET status = ?
        WHERE id = ?
      `).run(requestedStatus, loadId);
    }

    const mappedLoad = mapLoad(getLoadById(loadId));
    const io = req.app.get("io");
    if (io) {
      io.to("admins").emit("load_status_updated", { load: mappedLoad });

      if (mappedLoad.assignedDriver) {
        io.to("admins").emit("load_accepted", { load: mappedLoad });
      }
    }

    res.json({
      message: "Load updated successfully.",
      load: mappedLoad
    });
  } catch (error) {
    console.error("UPDATE LOAD ERROR:", error);
    res.status(500).json({ message: "Failed to update load." });
  }
};
