import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useLanguage } from "../../contexts/LanguageContext";
import { getDashboardPath, getStoredUser, isAuthenticated } from "../../lib/auth";
import api from "../../lib/api";

const modeConfig = {
  admin: {
    labelKey: "register.roleAdmin",
    titleKey: "login.adminTitle",
    subtitleKey: "login.adminSubtitle",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1600&q=80",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
    demoEmail: "admin@trucksup.local",
    demoPassword: "admin123"
  },
  driver: {
    labelKey: "register.roleDriver",
    titleKey: "login.driverTitle",
    subtitleKey: "login.driverSubtitle",
    image: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1600&q=80",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80",
    demoEmail: "driver@trucksup.local",
    demoPassword: "driver123"
  }
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setLanguage, t } = useLanguage();
  const initialMode = location.state?.role === "driver" ? "driver" : "admin";
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const user = getStoredUser();

  const modeData = useMemo(() => modeConfig[mode], [mode]);

  useEffect(() => {
    if (location.state?.role === "driver" || location.state?.role === "admin") {
      setMode(location.state.role);
    }
  }, [location.state]);

  if (isAuthenticated() && user) {
    return <Navigate to={getDashboardPath(user)} replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const fillDemo = () => {
    setForm({ email: modeData.demoEmail, password: modeData.demoPassword });
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);

      const response = await api.post("/auth/login", form);
      const nextPath = location.state?.from || (response.data.user.role === "driver" ? "/driver" : "/admin");
      const nextLanguage = response.data.user.preferredLanguage || "en";

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      localStorage.setItem("language", nextLanguage);
      window.dispatchEvent(new Event("trucks-up-language-change"));
      await setLanguage(nextLanguage);

      toast.success(t("login.loginSuccess"));
      navigate(nextPath, { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || t("login.loginFail"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,_#dbeafe,_#e2e8f0_45%,_#f8fafc)] px-4 py-10">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl lg:grid-cols-[1.15fr_0.85fr]">
        <section
          className="relative px-8 py-10 text-white sm:px-10"
          style={{
            backgroundImage: `linear-gradient(120deg, rgba(2,6,23,0.78), rgba(15,23,42,0.65)), url('${modeData.image}')`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">Trucks Up</p>
          <h1 className="mt-5 text-4xl font-black leading-tight">{t(modeData.titleKey)}</h1>
          <p className="mt-4 max-w-md text-slate-200">{t(modeData.subtitleKey)}</p>

          <div className="mt-8 inline-flex rounded-full bg-white/10 p-1 backdrop-blur">
            <button onClick={() => setMode("admin")} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "admin" ? "bg-white text-slate-900" : "text-white"}`}>
              {t("register.roleAdmin")}
            </button>
            <button onClick={() => setMode("driver")} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${mode === "driver" ? "bg-white text-slate-900" : "text-white"}`}>
              {t("register.roleDriver")}
            </button>
          </div>

          <div className="mt-8 flex items-center gap-4 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
            <img src={modeData.avatar} alt={t("login.profileAlt")} className="h-16 w-16 rounded-full border border-white/40 object-cover" />
            <div>
              <p className="text-sm text-slate-200">{t("login.demoUser").replace("{mode}", t(modeData.labelKey))}</p>
              <p className="font-semibold">{modeData.demoEmail}</p>
              <p className="text-slate-300">{modeData.demoPassword}</p>
            </div>
          </div>
        </section>

        <section className="px-8 py-10 sm:px-10">
          <h2 className="text-3xl font-bold text-slate-900">{t("login.welcome")}</h2>
          <p className="mt-2 text-slate-600">{t("login.subtitle")}</p>

          <button type="button" onClick={fillDemo} className="mt-5 rounded-full border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-900 transition hover:bg-cyan-100">
            {t("login.fillDemo").replace("{mode}", t(modeData.labelKey))}
          </button>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder={t("register.email")} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400" required />
            <input type="password" name="password" value={form.password} onChange={handleChange} placeholder={t("register.password")} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400" required />
            <button type="submit" disabled={loading} className="w-full rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70">
              {loading ? t("login.signingIn") : t("login.login")}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-600">
            {t("login.needAccount")}{" "}
            <Link to="/register" state={{ role: mode, from: location.state?.from }} className="font-semibold text-cyan-700">{t("register.submit")}</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
