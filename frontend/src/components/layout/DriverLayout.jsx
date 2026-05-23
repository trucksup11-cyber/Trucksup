import { Link, useLocation, useNavigate } from "react-router-dom";

import { useLanguage } from "../../contexts/LanguageContext";
import { disconnectSocket } from "../../lib/socket";

const links = [
  { to: "/driver", labelKey: "dashboard" },
  { to: "/driver/loads", labelKey: "loads" },
  { to: "/driver/trucks", labelKey: "trucks" }
];

export default function DriverLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    disconnectSocket();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-emerald-50 text-slate-900">
      <header className="border-b border-emerald-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-600">Trucks Up</p>
            <h1 className="text-2xl font-bold">{t("driverPanel")}</h1>
            <p className="text-sm text-slate-600">{user?.email || t("loggedInDriver")}</p>
          </div>

          <div className="flex items-center gap-2">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  location.pathname === link.to
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                }`}
              >
                {t(link.labelKey)}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              {t("logout")}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
