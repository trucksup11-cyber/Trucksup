import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import truckBanner from "../assets/truck banner.png";
import LanguageSelector from "../components/common/LanguageSelector";
import { useLanguage } from "../contexts/LanguageContext";
import { getDashboardPath, getStoredUser, isAuthenticated } from "../lib/auth";
import api from "../lib/api";

const actionCards = [
  {
    role: "admin",
    titleKey: "home.adminLogin",
    descriptionKey: "home.adminDescription",
    tone: "border-cyan-200 bg-cyan-50 text-cyan-950",
    button: "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
  },
  {
    role: "driver",
    titleKey: "home.driverLogin",
    descriptionKey: "home.driverDescription",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-950",
    button: "bg-emerald-600 text-white hover:bg-emerald-700"
  }
];

const statusKey = (status) => {
  if (status === "On Delivery") return "status.onDelivery";
  if (status === "In Transit" || status === "In Order") return "status.inTransit";
  return `status.${String(status || "available").toLowerCase()}`;
};

export default function Home() {
  const [trucks, setTrucks] = useState([]);
  const [loads, setLoads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const { formatCurrency, formatNumber, t } = useLanguage();
  const user = getStoredUser();

  useEffect(() => {
    const loadPublicDashboard = async () => {
      try {
        const [truckResponse, loadResponse] = await Promise.all([api.get("/trucks"), api.get("/loads")]);
        setTrucks(truckResponse.data);
        setLoads(loadResponse.data);
        setHasLoadError(false);
      } catch {
        setHasLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    loadPublicDashboard();
  }, []);

  const dashboardStats = useMemo(
    () => [
      { label: t("home.totalRegisteredTrucks"), value: formatNumber(trucks.length), detail: t("home.totalRegisteredTrucksDetail") },
      { label: t("home.totalRegisteredLoads"), value: formatNumber(loads.length), detail: t("home.totalRegisteredLoadsDetail") },
      { label: t("home.availableTrucks"), value: formatNumber(trucks.filter((truck) => truck.status === "Available").length), detail: t("home.availableTrucksDetail") }
    ],
    [formatNumber, loads.length, t, trucks]
  );

  const featuredLoads = loads.slice(0, 3);
  const featuredTrucks = trucks.slice(0, 3);

  if (isAuthenticated() && user) {
    return <Navigate to={getDashboardPath(user)} replace />;
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#f4f0e8] text-slate-950">
      <section
        className="relative px-4 pb-16 pt-5 text-white sm:px-6 lg:pb-24"
        style={{
          backgroundImage:
            "linear-gradient(115deg, rgba(7,16,28,0.94) 0%, rgba(15,23,42,0.86) 46%, rgba(9,52,67,0.62) 100%), url('https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1900&q=85')",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#f4f0e8] to-transparent" />
        <div className="relative mx-auto max-w-7xl">
          <header className="flex flex-col gap-4 rounded-[1.75rem] border border-white/15 bg-white/10 px-5 py-4 shadow-2xl backdrop-blur md:flex-row md:items-center md:justify-between">
            <Link to="/" className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-400 text-2xl font-black text-slate-950">TU</span>
              <span>
                <span className="block text-sm font-semibold uppercase tracking-[0.35em] text-amber-200">Trucks Up</span>
                <span className="block text-sm text-slate-200">{t("home.publicLogisticsDashboard")}</span>
              </span>
            </Link>

            <nav className="flex flex-wrap items-center gap-2">
              <LanguageSelector />
              <Link to="/login" state={{ role: "admin" }} className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15">
                {t("home.adminLogin")}
              </Link>
              <Link to="/login" state={{ role: "driver" }} className="rounded-full border border-emerald-200/70 px-4 py-2 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-400/20">
                {t("home.driverLogin")}
              </Link>
            </nav>
          </header>

          <div className="grid gap-10 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.4em] text-amber-200">{t("home.nationalFleetVisibility")}</p>
              <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
                {t("home.heroTitle")}
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
                {t("home.heroSubtitle")}
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link to="/login" state={{ role: "admin" }} className="rounded-full bg-amber-400 px-6 py-3 font-bold text-slate-950 shadow-lg shadow-amber-950/30 transition hover:-translate-y-0.5 hover:bg-amber-300">
                  {t("home.adminLogin")}
                </Link>
                <Link to="/login" state={{ role: "driver" }} className="rounded-full border border-white/30 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20">
                  {t("home.driverLogin")}
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-8 top-8 h-36 w-36 rounded-full bg-cyan-400/30 blur-3xl" />
              <div className="absolute -right-4 bottom-2 h-44 w-44 rounded-full bg-amber-300/30 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2.5rem] border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur">
                <img src={truckBanner} alt={t("home.bannerAlt")} className="h-[360px] w-full rounded-[2rem] object-cover" />
                <div className="absolute bottom-8 left-8 right-8 rounded-[1.5rem] border border-white/20 bg-slate-950/75 p-5 backdrop-blur">
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">{t("home.bannerHindiText")}</p>
                  <p className="mt-2 text-3xl font-black">{loading ? t("home.loading") : `${formatNumber(trucks.length)} ${t("trucks")} / ${formatNumber(loads.length)} ${t("loads")}`}</p>
                  {hasLoadError ? <p className="mt-2 text-sm text-amber-100">{t("home.backendReachable")}</p> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto -mt-12 max-w-7xl px-4 pb-16 sm:px-6">
        <section className="relative z-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dashboardStats.map((stat) => (
            <article key={stat.label} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">{stat.label}</p>
              <p className="mt-4 text-4xl font-black tracking-tight text-slate-950">{loading ? "..." : stat.value}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{stat.detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-2xl shadow-slate-900/10">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-amber-300">{t("home.chooseWorkspace")}</p>
            <h2 className="mt-4 text-3xl font-black">{t("home.workspaceTitle")}</h2>
            <div className="mt-6 grid gap-4">
              {actionCards.map((card) => (
                <article key={card.role} className={`rounded-[1.5rem] border p-5 ${card.tone}`}>
                  <h3 className="text-xl font-black">{t(card.titleKey)}</h3>
                  <p className="mt-2 text-sm leading-6 opacity-80">{t(card.descriptionKey)}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link to="/login" state={{ role: card.role }} className={`rounded-full px-5 py-2 text-sm font-bold transition ${card.button}`}>
                      {t("login.login")}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
            <section className="rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-900/5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-700">{t("home.recentlyRegisteredTrucks")}</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">{t("home.fleetSnapshot")}</h2>
                </div>
                <Link to="/admin/trucks" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                  {t("home.viewTrucks")}
                </Link>
              </div>
              <div className="mt-5 grid gap-3">
                {featuredTrucks.map((truck) => (
                  <div key={truck.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="font-bold text-slate-950">{truck.truckNumber}</p>
                      <p className="text-sm text-slate-600">{truck.driver || t("home.driverNotAssigned")}</p>
                    </div>
                    <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-900">{t(statusKey(truck.status))}</span>
                  </div>
                ))}
                {!loading && featuredTrucks.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-slate-600">{t("home.noTrucksRegistered")}</p> : null}
              </div>
            </section>

            <section className="rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-900/5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.24em] text-emerald-700">{t("home.recentlyRegisteredLoads")}</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">{t("home.loadMovementSnapshot")}</h2>
                </div>
                <Link to="/admin/loads" className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                  {t("home.viewLoads")}
                </Link>
              </div>
              <div className="mt-5 grid gap-3">
                {featuredLoads.map((load) => (
                  <div key={load.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-bold text-slate-950">{load.pickup} {"->"} {load.dropLocation}</p>
                        <p className="text-sm text-slate-600">{formatNumber(load.weight || 0)} {t("admin.tons")} / {formatCurrency(load.price || 0)}</p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">{t(statusKey(load.status))}</span>
                    </div>
                  </div>
                ))}
                {!loading && featuredLoads.length === 0 ? <p className="rounded-2xl bg-slate-50 p-4 text-slate-600">{t("home.noLoadsRegistered")}</p> : null}
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
