import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import DriverLayout from "../../components/layout/DriverLayout";
import { useLanguage } from "../../contexts/LanguageContext";
import api from "../../lib/api";
import { normalizeCity, resolveLoadDropCity, resolveLoadPickupCity, resolveTruckCity } from "../../lib/location";
import { getSocket } from "../../lib/socket";

const LOCATION_PUSH_INTERVAL_MS = 20000;

const statusKey = (status) => {
  if (status === "On Delivery") return "status.onDelivery";
  if (status === "In Transit" || status === "In Order") return "status.inTransit";
  return `status.${String(status || "available").toLowerCase()}`;
};

export default function DriverLoads() {
  const [loads, setLoads] = useState([]);
  const [myTruck, setMyTruck] = useState(null);
  const [searchCity, setSearchCity] = useState("");
  const [acceptingLoadId, setAcceptingLoadId] = useState(null);
  const [dismissedLoadIds, setDismissedLoadIds] = useState([]);
  const { t, formatNumber, formatCurrency } = useLanguage();

  const fetchNearbyLoads = async (city = searchCity) => {
    try {
      const normalized = normalizeCity(city);
      const query = normalized ? `?city=${encodeURIComponent(normalized)}` : "";
      const response = await api.get(`/loads/nearby${query}`);
      setLoads(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || t("toast.nearbyLoadsFailed"));
    }
  };

  const fetchMyTruck = async () => {
    try {
      const response = await api.get("/trucks/me");
      setMyTruck(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || t("toast.truckProfileFailed"));
    }
  };

  useEffect(() => {
    fetchNearbyLoads();
    fetchMyTruck();
  }, [t, searchCity]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      return undefined;
    }

    const onNearbyLoad = () => {
      fetchNearbyLoads();
    };

    socket.on("new_nearby_load", onNearbyLoad);
    socket.on("load_status_updated", onNearbyLoad);

    return () => {
      socket.off("new_nearby_load", onNearbyLoad);
      socket.off("load_status_updated", onNearbyLoad);
    };
  }, [t, searchCity]);

  useEffect(() => {
    const pushLocation = () => {
      if (!navigator.geolocation || !myTruck) {
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await api.patch("/trucks/me/location", {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
            setMyTruck(response.data.truck);
          } catch (_error) {
            // Keep the dashboard usable even if live location updates fail.
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    };

    pushLocation();
    const timer = setInterval(pushLocation, LOCATION_PUSH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [myTruck?.id]);

  const acceptLoad = async (loadId) => {
    try {
      setAcceptingLoadId(loadId);
      await api.patch(`/loads/${loadId}/status`, { status: "Assigned" });
      toast.success(t("toast.loadAcceptedSuccess"));
      await Promise.all([fetchNearbyLoads(), fetchMyTruck()]);
    } catch (error) {
      toast.error(error.response?.data?.message || t("toast.acceptLoadFailed"));
    } finally {
      setAcceptingLoadId(null);
    }
  };

  const rejectLoad = (loadId) => {
    setDismissedLoadIds((current) => [...current, loadId]);
    toast(t("driver.loadHiddenNearby"));
  };

  const visibleLoads = useMemo(
    () => loads.filter((load) => !dismissedLoadIds.includes(load.id)),
    [dismissedLoadIds, loads]
  );
  const availableCount = useMemo(() => visibleLoads.filter((load) => load.status === "Available").length, [visibleLoads]);
  const truckCity = resolveTruckCity(myTruck);

  return (
    <DriverLayout>
      <section className="rounded-[1.75rem] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold">{t("availableLoads")}</h2>
            <p className="text-slate-600">{t("driver.searchByCityHelp")}</p>
          </div>
          <div className="w-full max-w-sm">
            <label className="mb-2 block text-sm font-medium text-slate-700">{t("driver.searchCity")}</label>
            <input
              value={searchCity}
              onChange={(event) => setSearchCity(event.target.value)}
              placeholder={truckCity ? t("driver.tryCity").replace("{city}", truckCity) : t("driver.enterCityName")}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-400"
            />
          </div>
          <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-900">{formatNumber(availableCount)} {t("driver.available")}</span>
        </div>

        {myTruck ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="font-semibold">{t("driver.truck")}: {myTruck.truckNumber}</p>
            <p>
              {t("driver")}: {myTruck.driver}
              {myTruck.driverPhone ? ` | ${t("phone")}: ${myTruck.driverPhone}` : ""}
            </p>
            <p>{t("driver.currentCity")}: {truckCity || t("common.unknown")}</p>
            <p>{t("driver.liveCoordinates")}: {myTruck.latitude}, {myTruck.longitude}</p>
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {visibleLoads.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-slate-600">{t("driver.noMatchingLoadsForCity")}</p> : null}

          {visibleLoads.map((load) => (
            <article key={load.id} className="rounded-[1.5rem] border border-slate-200 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-900">{load.pickup} {"->"} {load.dropLocation}</h3>
                  <p className="text-slate-600">{formatNumber(load.weight)} {t("admin.tons")} | {formatCurrency(load.price)}</p>
                  <p className="text-sm font-medium text-emerald-700">{t(statusKey(load.status))}</p>

                  <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                    <p><span className="font-semibold">{t("shipment")}:</span> {load.shipmentName || t("common.notProvided")}</p>
                    <p><span className="font-semibold">{t("phone")}:</span> {load.shipmentPhone || t("common.notProvided")}</p>
                    <p><span className="font-semibold">{t("admin.pickupCity")}:</span> {resolveLoadPickupCity(load)}</p>
                    <p><span className="font-semibold">{t("driver.dropCity")}:</span> {resolveLoadDropCity(load)}</p>
                    <p className="sm:col-span-2"><span className="font-semibold">{t("driver.address")}:</span> {load.shipmentAddress || load.pickup}</p>
                    <p><span className="font-semibold">{t("driver.reference")}:</span> {load.referenceNumber || `LD-${load.id}`}</p>
                    <p><span className="font-semibold">{t("driver.status")}:</span> {t(statusKey(load.status))}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 lg:flex-col">
                  <button
                    onClick={() => acceptLoad(load.id)}
                    disabled={load.status !== "Available" || acceptingLoadId === load.id}
                    className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {acceptingLoadId === load.id ? t("toast.accepting") : load.status === "Available" ? t("acceptLoad") : t("alreadyAssigned")}
                  </button>
                  {load.status === "Available" ? (
                    <button
                      onClick={() => rejectLoad(load.id)}
                      className="rounded-full bg-rose-100 px-5 py-3 text-sm font-semibold text-rose-900 transition hover:bg-rose-200"
                    >
                      {t("driver.reject")}
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </DriverLayout>
  );
}
