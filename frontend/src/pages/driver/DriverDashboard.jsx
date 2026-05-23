import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import toast from "react-hot-toast";

import LanguageSelector from "../../components/common/LanguageSelector";
import DriverLayout from "../../components/layout/DriverLayout";
import { useLanguage } from "../../contexts/LanguageContext";
import api from "../../lib/api";
import { getCityLabel, normalizeCity, resolveLoadDropCity, resolveLoadPickupCity, resolveTruckCity } from "../../lib/location";
import { getSocket } from "../../lib/socket";

export default function DriverDashboard() {
  const [nearbyLoads, setNearbyLoads] = useState([]);
  const [myTruck, setMyTruck] = useState(null);
  const [searchCity, setSearchCity] = useState("");
  const [acceptingLoadId, setAcceptingLoadId] = useState(null);
  const [dismissedLoadIds, setDismissedLoadIds] = useState([]);
  const { t, formatNumber } = useLanguage();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);

  const fetchData = async (city = searchCity) => {
    try {
      const normalizedCity = normalizeCity(city);
      const query = normalizedCity ? `?city=${encodeURIComponent(normalizedCity)}` : "";
      const [loadsResponse, truckResponse] = await Promise.all([api.get(`/loads/nearby${query}`), api.get("/trucks/me")]);
      setNearbyLoads(loadsResponse.data);
      setMyTruck(truckResponse.data);
    } catch (error) {
      toast.error(error.response?.data?.message || t("toast.driverDashboardFailed"));
    }
  };

  useEffect(() => {
    fetchData();
  }, [t, searchCity]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      return undefined;
    }

    const onRefresh = () => fetchData();

    socket.on("new_nearby_load", onRefresh);
    socket.on("load_status_updated", onRefresh);

    return () => {
      socket.off("new_nearby_load", onRefresh);
      socket.off("load_status_updated", onRefresh);
    };
  }, [t, searchCity]);

  const visibleLoads = useMemo(
    () => nearbyLoads.filter((load) => !dismissedLoadIds.includes(load.id)),
    [dismissedLoadIds, nearbyLoads]
  );

  const availableLoads = useMemo(
    () => visibleLoads.filter((load) => load.status === "Available"),
    [visibleLoads]
  );

  const currentAssigned = visibleLoads.find((load) => load.status === "Assigned" && load.assignedTo === user.id);
  const nearestLoad = availableLoads[0] || null;
  const nearbyCount = availableLoads.length;
  const selectedCity = getCityLabel(searchCity) || resolveTruckCity(myTruck);

  const acceptLoad = async (loadId) => {
    try {
      setAcceptingLoadId(loadId);
      await api.patch(`/loads/${loadId}/status`, { status: "Assigned" });
      toast.success(t("toast.loadAcceptedSuccess"));
      await fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || t("toast.acceptLoadFailed"));
    } finally {
      setAcceptingLoadId(null);
    }
  };

  const rejectLoad = (loadId) => {
    setDismissedLoadIds((current) => [...current, loadId]);
    toast(t("driver.loadHiddenBoard"));
  };

  return (
    <DriverLayout>
      <section className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-100 bg-white p-3 shadow-sm">
        <img src="https://cdn-icons-png.flaticon.com/512/3448/3448339.png" alt="Truck" className="h-10 w-10 object-contain" />
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-800">{t("slogan")}</p>
      </section>

      <div className="mb-4 flex justify-end">
        <LanguageSelector />
      </div>

      <section
        className="rounded-[2rem] px-6 py-8 text-white shadow-lg"
        style={{
          backgroundImage:
            "linear-gradient(140deg, rgba(2,44,34,0.85), rgba(6,78,59,0.75)), url('https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1600&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-100">{t("driver.workspace")}</p>
        <h2 className="mt-3 text-4xl font-black">{t("driver.workspaceText")}</h2>
        <p className="mt-3 max-w-2xl text-emerald-50">{t("driver.workspaceSub")}</p>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <Link to="/driver/loads" className="rounded-[1.75rem] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">{t("loads")}</p>
          <h3 className="mt-3 text-2xl font-bold text-slate-900">{t("driver.nearbyAvailable").replace("{count}", formatNumber(nearbyCount))}</h3>
          <p className="mt-2 text-slate-600">{selectedCity ? t("driver.showingCityMatches").replace("{city}", selectedCity) : t("driver.acceptJobs")}</p>
        </Link>

        <div className="rounded-[1.75rem] bg-slate-900 p-6 text-white shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">{t("driver.currentCityDispatch")}</p>
          <h3 className="mt-3 text-2xl font-bold">{nearestLoad ? resolveLoadPickupCity(nearestLoad) : t("driver.noNearbyPickup")}</h3>
          <p className="mt-2 text-slate-300">
            {nearestLoad ? `${nearestLoad.pickup} -> ${nearestLoad.dropLocation}` : t("driver.moveCloser")}
          </p>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-sm">
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">{t("driver.liveMapTitle")}</h3>
              <p className="mt-1 text-slate-600">{t("driver.liveMapDescription")}</p>
            </div>
            <div className="w-full max-w-sm">
              <label className="mb-2 block text-sm font-medium text-slate-700">{t("driver.searchLoadsByCity")}</label>
              <input
                value={searchCity}
                onChange={(event) => setSearchCity(event.target.value)}
                placeholder={resolveTruckCity(myTruck) ? t("driver.tryCity").replace("{city}", resolveTruckCity(myTruck)) : t("driver.enterCityName")}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-400"
              />
            </div>
          </div>

          <div className="h-[360px]">
            <MapContainer center={[Number(myTruck?.latitude) || 22.7196, Number(myTruck?.longitude) || 75.8577]} zoom={7} style={{ height: "100%", width: "100%" }}>
              <TileLayer attribution='&copy; OpenStreetMap contributors &copy; CARTO' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />

              {myTruck && Number.isFinite(Number(myTruck.latitude)) && Number.isFinite(Number(myTruck.longitude)) ? (
                <CircleMarker center={[Number(myTruck.latitude), Number(myTruck.longitude)]} radius={12} pathOptions={{ color: "#065f46", fillColor: "#10b981", fillOpacity: 0.9 }}>
                  <Popup>
                    <div>
                      <p className="font-semibold">{myTruck.truckNumber}</p>
                      <p>{myTruck.driver}</p>
                      <p>{resolveTruckCity(myTruck) || t("driver.liveTruckLocation")}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ) : null}

              {availableLoads.map((load) => (
                <CircleMarker
                  key={load.id}
                  center={[Number(load.pickupLatitude), Number(load.pickupLongitude)]}
                  radius={10}
                  pathOptions={{ color: "#0f172a", fillColor: "#38bdf8", fillOpacity: 0.85 }}
                >
                  <Popup>
                    <div>
                      <p className="font-semibold">{load.referenceNumber || `LD-${load.id}`}</p>
                      <p>{load.pickup} {"->"} {load.dropLocation}</p>
                      <p>{load.shipmentName || t("shipment")}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>

        <div className="rounded-[1.5rem] bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-slate-900">{t("driver.currentTrip")}</h3>
          <div className="mt-3 space-y-2 text-slate-700">
            <p>{t("driver.truck")}: {myTruck?.truckNumber || t("common.notAvailable")}</p>
            <p>{t("driver.status")}: {myTruck?.status ? t(myTruck.status === "On Delivery" ? "status.onDelivery" : myTruck.status === "In Transit" || myTruck.status === "In Order" ? "status.inTransit" : `status.${myTruck.status.toLowerCase()}`) : t("common.notAvailable")}</p>
            <p>{t("driver.currentCity")}: {resolveTruckCity(myTruck) || t("common.unknown")}</p>
            <p>{t("driver.assignedLoad")}: {currentAssigned ? `${currentAssigned.pickup} -> ${currentAssigned.dropLocation}` : t("driver.noActiveLoad")}</p>
            <p>{t("driver.visibility")}</p>
          </div>

          {currentAssigned ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
              <p className="font-semibold">{t("driver.shipmentDetails")}</p>
              <p>{currentAssigned.shipmentName || t("common.notProvided")}</p>
              <p>{currentAssigned.shipmentPhone || t("common.notProvided")}</p>
              <p>{currentAssigned.shipmentAddress || currentAssigned.pickup}</p>
              <p>{resolveLoadPickupCity(currentAssigned)} {"->"} {resolveLoadDropCity(currentAssigned)}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-6 rounded-[1.5rem] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{t("driver.dispatchAlerts")}</h3>
            <p className="text-slate-600">{t("driver.dispatchAlertsDescription")}</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-900">
            {selectedCity || t("driver.allCities")}
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {availableLoads.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-slate-600">{t("driver.noAvailableLoadsForCity")}</p> : null}

          {availableLoads.map((load) => (
            <article key={load.id} className="rounded-[1.5rem] border border-slate-200 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">{t("driver.pickupAlert").replace("{city}", resolveLoadPickupCity(load))}</p>
                  <h4 className="text-xl font-bold text-slate-900">{load.pickup} {"->"} {load.dropLocation}</h4>
                  <p className="text-slate-600">{t("driver.referenceLabel")}: {load.referenceNumber || `LD-${load.id}`}</p>

                  <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                    <p><span className="font-semibold">{t("shipment")}:</span> {load.shipmentName || t("common.notProvided")}</p>
                    <p><span className="font-semibold">{t("phone")}:</span> {load.shipmentPhone || t("common.notProvided")}</p>
                    <p><span className="font-semibold">{t("admin.pickupCity")}:</span> {resolveLoadPickupCity(load)}</p>
                    <p><span className="font-semibold">{t("driver.dropCity")}:</span> {resolveLoadDropCity(load)}</p>
                    <p className="sm:col-span-2"><span className="font-semibold">{t("driver.address")}:</span> {load.shipmentAddress || load.pickup}</p>
                    <p><span className="font-semibold">{t("driver.reference")}:</span> {load.referenceNumber || `LD-${load.id}`}</p>
                    <p><span className="font-semibold">{t("driver.status")}:</span> {t(load.status === "On Delivery" ? "status.onDelivery" : load.status === "In Transit" || load.status === "In Order" ? "status.inTransit" : `status.${String(load.status || "available").toLowerCase()}`)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 lg:flex-col">
                  <button
                    onClick={() => acceptLoad(load.id)}
                    disabled={acceptingLoadId === load.id}
                    className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {acceptingLoadId === load.id ? t("toast.accepting") : t("acceptLoad")}
                  </button>
                  <button
                    onClick={() => rejectLoad(load.id)}
                    className="rounded-full bg-rose-100 px-5 py-3 text-sm font-semibold text-rose-900 transition hover:bg-rose-200"
                  >
                    {t("driver.reject")}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </DriverLayout>
  );
}
