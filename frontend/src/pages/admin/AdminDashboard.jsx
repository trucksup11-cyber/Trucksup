import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import toast from "react-hot-toast";

import LanguageSelector from "../../components/common/LanguageSelector";
import AdminLayout from "../../components/layout/AdminLayout";
import { useLanguage } from "../../contexts/LanguageContext";
import api from "../../lib/api";

const cardStyles = ["from-sky-500 to-cyan-400", "from-emerald-500 to-lime-400", "from-amber-500 to-orange-400", "from-rose-500 to-pink-400"];
const mapLinks = [
  { to: "/admin/trucks", titleKey: "trucks", descriptionKey: "admin.openTrucksView", tone: "bg-cyan-50 text-cyan-900 border-cyan-200" },
  { to: "/admin/loads", titleKey: "loads", descriptionKey: "admin.openLoadsView", tone: "bg-emerald-50 text-emerald-900 border-emerald-200" },
  { to: "/admin/map", titleKey: "map", descriptionKey: "admin.openMapView", tone: "bg-amber-50 text-amber-900 border-amber-200" }
];

export default function AdminDashboard() {
  const [trucks, setTrucks] = useState([]);
  const [loads, setLoads] = useState([]);
  const { t, formatNumber, formatCurrency } = useLanguage();
  const isLoggedIn = Boolean(localStorage.getItem("token"));

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [truckResponse, loadResponse] = await Promise.all([api.get("/trucks"), api.get("/loads")]);
        setTrucks(truckResponse.data);
        setLoads(loadResponse.data);
      } catch (error) {
        toast.error(error.response?.data?.message || t("toast.loadDashboardFailed"));
      }
    };

    loadDashboard();
  }, [t]);

  const stats = [
    { label: t("admin.totalTrucks"), value: trucks.length },
    { label: t("admin.availableTrucks"), value: trucks.filter((truck) => truck.status === "Available").length },
    { label: t("admin.loadsTransit"), value: loads.filter((load) => load.status === "In Transit" || load.status === "In Order" || load.status === "Assigned").length },
    { label: t("admin.loadsAvailable"), value: loads.filter((load) => load.status === "Available").length }
  ];

  const liveMarkers = useMemo(
    () =>
      trucks.filter(
        (truck) =>
          Number.isFinite(Number(truck.latitude)) &&
          Number.isFinite(Number(truck.longitude))
      ),
    [trucks]
  );

  return (
    <AdminLayout>
      <section className="mb-4 flex items-center gap-3 rounded-xl border border-cyan-100 bg-white p-3 shadow-sm">
        <img src="https://cdn-icons-png.flaticon.com/512/3448/3448339.png" alt="Truck" className="h-10 w-10 object-contain" />
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-800">{t("slogan")}</p>
      </section>

      <div className="mb-4 flex justify-end">
        <LanguageSelector />
      </div>

      <section
        className="rounded-[2rem] px-6 py-8 text-white shadow-xl sm:px-8"
        style={{
          backgroundImage:
            "linear-gradient(120deg, rgba(2,6,23,0.9), rgba(15,23,42,0.75)), url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">{t("admin.operations")}</p>
        <h2 className="mt-3 text-4xl font-black">{t("admin.liveOverview")}</h2>
        <p className="mt-3 max-w-2xl text-slate-200">{t("admin.liveOverviewSub")}</p>
        <p className="mt-4 max-w-2xl text-sm text-slate-300">
          {isLoggedIn ? t("admin.loggedInPrompt") : t("admin.guestExplorePrompt")}
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {mapLinks.map((link) => (
          <Link key={link.to} to={link.to} className={`rounded-[1.5rem] border p-5 transition hover:-translate-y-1 hover:shadow-md ${link.tone}`}>
            <p className="text-sm font-semibold uppercase tracking-[0.2em]">{t(link.titleKey)}</p>
            <p className="mt-2 text-sm opacity-80">{t(link.descriptionKey)}</p>
          </Link>
        ))}
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <article key={stat.label} className={`rounded-[1.75rem] bg-gradient-to-br ${cardStyles[index]} p-6 text-slate-950 shadow-lg`}>
            <p className="text-sm font-semibold uppercase tracking-[0.2em]">{stat.label}</p>
            <p className="mt-4 text-4xl font-black">{formatNumber(stat.value)}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 pt-6">
            <div>
              <h3 className="text-xl font-bold">{t("admin.liveMap")}</h3>
              <p className="mt-1 text-sm text-slate-600">{t("admin.liveMapSub")}</p>
            </div>
            <Link to="/admin/map" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              {t("map")}
            </Link>
          </div>

          <div className="mt-5 h-[320px]">
            <MapContainer center={[22.7196, 75.8577]} zoom={5} style={{ height: "100%", width: "100%" }}>
              <TileLayer attribution='&copy; OpenStreetMap contributors &copy; CARTO' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
              {liveMarkers.map((truck) => (
                <CircleMarker
                  key={truck.id}
                  center={[Number(truck.latitude), Number(truck.longitude)]}
                  radius={9}
                  pathOptions={{ color: "#0f172a", fillColor: "#06b6d4", fillOpacity: 0.85 }}
                >
                  <Popup>
                    <div>
                      <p className="font-semibold">{truck.truckNumber}</p>
                      <p>{truck.driver}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-[1.75rem] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">{t("admin.recentTrucks")}</h3>
              <span className="text-sm text-slate-500">{formatNumber(trucks.length)} {t("admin.total")}</span>
            </div>

            <div className="mt-5 space-y-4">
              {trucks.slice(0, 4).map((truck) => (
                <div key={truck.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
                  <div>
                    <p className="font-semibold text-slate-900">{truck.truckNumber}</p>
                    <p className="text-sm text-slate-600">{truck.driver}</p>
                  </div>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">{t(`status.${truck.status === "On Delivery" ? "onDelivery" : truck.status === "In Transit" || truck.status === "In Order" ? "inTransit" : truck.status.toLowerCase()}`)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">{t("admin.recentLoads")}</h3>
              <span className="text-sm text-slate-500">{formatNumber(loads.length)} {t("admin.total")}</span>
            </div>

            <div className="mt-5 space-y-4">
              {loads.slice(0, 4).map((load) => (
                <div key={load.id} className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">{load.pickup} {"->"} {load.dropLocation}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatNumber(load.weight)} {t("admin.tons")} - {formatCurrency(load.price)}
                  </p>
                  <p className="mt-2 text-sm font-medium text-emerald-700">{t(`status.${load.status === "On Delivery" ? "onDelivery" : load.status === "In Transit" || load.status === "In Order" ? "inTransit" : load.status.toLowerCase()}`)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </AdminLayout>
  );
}
