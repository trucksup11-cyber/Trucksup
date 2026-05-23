import { Link, useLocation, useNavigate } from "react-router-dom";

import { useLanguage } from "../../contexts/LanguageContext";
import { disconnectSocket } from "../../lib/socket";

const links = [
  { to: "/admin", labelKey: "dashboard" },
  { to: "/admin/trucks", labelKey: "trucks" },
  { to: "/admin/loads", labelKey: "loads" },
  { to: "/admin/map", labelKey: "map" }
];

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    disconnectSocket();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 lg:flex">
      <aside className="border-b border-slate-200 bg-slate-950 px-6 py-6 text-white lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r lg:border-slate-800">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Trucks Up</p>
          <h1 className="mt-2 text-3xl font-bold">{t("adminConsole")}</h1>
          <p className="mt-2 text-sm text-slate-300">{user?.email || t("manageFleet")}</p>
        </div>

        <nav className="space-y-2">
          {links.map((link) => {
            const isActive = location.pathname === link.to;

            return (
              <Link
                key={link.to}
                to={link.to}
                className={`block rounded-xl px-4 py-3 transition ${
                  isActive ? "bg-cyan-400 text-slate-950" : "bg-slate-900 text-slate-200 hover:bg-slate-800"
                }`}
              >
                {t(link.labelKey)}
              </Link>
            );
          })}
        </nav>

        {token ? (
          <button
            onClick={handleLogout}
            className="mt-8 w-full rounded-xl border border-slate-700 px-4 py-3 text-left text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
          >
            {t("logout")}
          </button>
        ) : (
          <div className="mt-8 space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-sm text-slate-300">{t("admin.guestPrompt")}</p>
            <Link
              to="/register"
              state={{ from: location.pathname }}
              className="block rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              {t("register.submit")}
            </Link>
            <Link
              to="/login"
              state={{ from: location.pathname }}
              className="block rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              {t("login.login")}
            </Link>
          </div>
        )}
      </aside>

      <main className="flex-1 p-4 sm:p-6 lg:p-10">{children}</main>
    </div>
  );
}
