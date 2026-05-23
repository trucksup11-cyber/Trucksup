const CITY_COORDINATES = {
  indore: { lat: 22.7196, lng: 75.8577, label: "Indore" },
  bhopal: { lat: 23.2599, lng: 77.4126, label: "Bhopal" },
  pune: { lat: 18.5204, lng: 73.8567, label: "Pune" },
  mumbai: { lat: 19.076, lng: 72.8777, label: "Mumbai" },
  delhi: { lat: 28.6139, lng: 77.209, label: "Delhi" },
  jaipur: { lat: 26.9124, lng: 75.7873, label: "Jaipur" }
};

const toRadians = (value) => (value * Math.PI) / 180;

export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
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

export function normalizeCity(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function getCityLabel(value) {
  const normalized = normalizeCity(value);
  if (!normalized) {
    return "";
  }

  return normalized
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function inferCityFromCoordinates(latitude, longitude) {
  if (![latitude, longitude].every((value) => Number.isFinite(Number(value)))) {
    return "";
  }

  const nearest = Object.values(CITY_COORDINATES)
    .map((city) => ({
      label: city.label,
      distanceKm: haversineDistanceKm(latitude, longitude, city.lat, city.lng)
    }))
    .filter((city) => city.distanceKm !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];

  return nearest?.distanceKm != null && nearest.distanceKm <= 100 ? nearest.label : "";
}

export function resolveTruckCity(truck) {
  return getCityLabel(truck?.currentCity || inferCityFromCoordinates(truck?.latitude, truck?.longitude));
}

export function resolveLoadPickupCity(load) {
  return getCityLabel(load?.pickupCity || load?.pickup);
}

export function resolveLoadDropCity(load) {
  return getCityLabel(load?.dropCity || load?.dropLocation);
}
