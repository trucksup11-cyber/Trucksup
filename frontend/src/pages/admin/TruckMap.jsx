import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import toast from "react-hot-toast";

import AdminLayout from "../../components/layout/AdminLayout";
import { useLanguage } from "../../contexts/LanguageContext";
import api from "../../lib/api";
import { getSocket } from "../../lib/socket";

const statusColors = {
  Available: "#22c55e",
  "On Delivery": "#f59e0b",
  Maintenance: "#ef4444"
};
const AVG_SPEED_KMH = 35;

const toRadians = (value) => (value * Math.PI) / 180;
const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (![lat1, lon1, lat2, lon2].every((value) => Number.isFinite(Number(value)))) {
    return null;
  }

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
};

export default function TruckMap() {
  const [trucks, setTrucks] = useState([]);
  const [loads, setLoads] = useState([]);
  const { t, formatNumber, formatDistanceKm } = useLanguage();

  const fetchMapData = async () => {
    try {
      const [truckResponse, loadResponse] = await Promise.all([api.get("/trucks"), api.get("/loads")]);
      setTrucks(truckResponse.data);
      setLoads(loadResponse.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load map data.");
    }
  };

  useEffect(() => {
    fetchMapData();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      return undefined;
    }

    const onUpdate = () => fetchMapData();

    socket.on("truck_location_updated", onUpdate);
    socket.on("load_accepted", onUpdate);
    socket.on("load_status_updated", onUpdate);

    return () => {
      socket.off("truck_location_updated", onUpdate);
      socket.off("load_accepted", onUpdate);
      socket.off("load_status_updated", onUpdate);
    };
  }, []);

  const activeLoadMarkers = useMemo(
    () => loads.filter((load) => load.assignedDriver && typeof load.assignedDriver.latitude === "number"),
    [loads]
  );

  return (
    <AdminLayout>
      <section className="mb-6 rounded-[1.75rem] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold">{t("admin.liveMap")}</h2>
        <p className="mt-2 text-slate-600">{t("admin.liveMapSub")}</p>
      </section>

      <div className="overflow-hidden rounded-[2rem] border border-slate-200 shadow-lg">
        <MapContainer center={[22.7196, 75.8577]} zoom={5} style={{ height: "70vh", width: "100%" }}>
          <TileLayer attribution='&copy; OpenStreetMap contributors &copy; CARTO' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

          {trucks.map((truck) => (
            <CircleMarker
              key={`truck-${truck.id}`}
              center={[truck.latitude, truck.longitude]}
              radius={10}
              pathOptions={{
                color: statusColors[truck.status] || "#0f172a",
                fillColor: statusColors[truck.status] || "#0f172a",
                fillOpacity: 0.8
              }}
            >
              <Popup>
                <div className="space-y-1">
                  <p className="font-semibold">{truck.truckNumber}</p>
                  <p>{truck.driver}</p>
                  <p>{t("map.status")}: {truck.status}</p>
                  <p>{t("map.capacity")}: {formatNumber(truck.capacity)} {t("admin.tons")}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {activeLoadMarkers.map((load) => {
            const etaDistanceKm = haversineDistanceKm(
              Number(load.assignedDriver.latitude),
              Number(load.assignedDriver.longitude),
              Number(load.pickupLatitude),
              Number(load.pickupLongitude)
            );
            const etaMinutes = etaDistanceKm == null ? null : Math.max(1, Math.round((etaDistanceKm / AVG_SPEED_KMH) * 60));

            return (
              <CircleMarker
                key={`load-${load.id}`}
                center={[load.assignedDriver.latitude, load.assignedDriver.longitude]}
                radius={14}
                pathOptions={{
                  color: "#0ea5e9",
                  fillColor: "#38bdf8",
                  fillOpacity: 0.75
                }}
              >
                <Popup>
                  <div className="space-y-1">
                    <p className="font-semibold">{t("map.load")} {load.referenceNumber || `#${load.id}`}</p>
                    <p>{load.pickup} {"->"} {load.dropLocation}</p>
                    <p>{t("map.driver")}: {load.assignedDriver.name || t("driver")}</p>
                    <p>{t("map.phone")}: {load.assignedDriver.phone || "N/A"}</p>
                    <p>{t("map.etaPickup")}: {etaMinutes ? `${formatNumber(etaMinutes)} min` : "N/A"}</p>
                    <p>{t("map.distance")}: {etaDistanceKm ? `${formatDistanceKm(etaDistanceKm)} km` : "N/A"}</p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </AdminLayout>
  );
}
