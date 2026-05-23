import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useLanguage } from "../../contexts/LanguageContext";
import { getDashboardPath, getStoredUser, isAuthenticated } from "../../lib/auth";
import api from "../../lib/api";

const DEFAULT_PROFILE_IMAGE = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, t } = useLanguage();
  const initialRole = location.state?.role === "driver" ? "driver" : "admin";
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    profile_photo_url: DEFAULT_PROFILE_IMAGE,
    email: "",
    password: "",
    role: initialRole,
    aadhar_id: "",
    license_id: "",
    aadhar_file_url: "",
    license_file_url: "",
    preferred_language: language
  });
  const [loading, setLoading] = useState(false);
  const user = getStoredUser();

  useEffect(() => {
    setForm((current) => ({ ...current, preferred_language: language }));
  }, [language]);

  useEffect(() => {
    if (location.state?.role === "driver" || location.state?.role === "admin") {
      setForm((current) => ({ ...current, role: location.state.role }));
    }
  }, [location.state]);

  if (isAuthenticated() && user) {
    return <Navigate to={getDashboardPath(user)} replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleRoleChange = (event) => {
    const { value } = event.target;
    setForm((current) => ({
      ...current,
      role: value,
      ...(value === "admin"
        ? {
            aadhar_id: "",
            license_id: "",
            aadhar_file_url: "",
            license_file_url: ""
          }
        : {})
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      await api.post("/auth/register", form);
      toast.success(t("register.success"));
      navigate("/login", { state: { role: form.role, from: location.state?.from } });
    } catch (error) {
      toast.error(error.response?.data?.message || t("register.fail"));
    } finally {
      setLoading(false);
    }
  };

  const handleProfileFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const encoded = typeof reader.result === "string" ? reader.result : DEFAULT_PROFILE_IMAGE;
      setForm((current) => ({ ...current, profile_photo_url: encoded }));
    };
    reader.readAsDataURL(file);
  };

  const handleDocumentFile = (fieldName) => (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const encoded = typeof reader.result === "string" ? reader.result : "";
      setForm((current) => ({ ...current, [fieldName]: encoded }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(145deg,_#dcfce7,_#f8fafc_45%,_#cffafe)] px-4 py-10">
      <div className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 shadow-2xl sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-emerald-600">{t("register.create")}</p>
        <h1 className="mt-4 text-4xl font-black text-slate-900">{t("register.title")}</h1>
        <p className="mt-3 text-slate-600">{t("register.subtitle")}</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input type="text" name="full_name" value={form.full_name} onChange={handleChange} placeholder={t("register.fullName")} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-400" />
          <input type="text" name="phone" value={form.phone} onChange={handleChange} placeholder={t("register.phone")} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-400" />
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="mb-2 text-sm text-slate-600">{t("register.photo")}</p>
            <div className="flex items-center gap-4">
              <img src={form.profile_photo_url || DEFAULT_PROFILE_IMAGE} alt={t("register.profilePreviewAlt")} className="h-14 w-14 rounded-full object-cover" />
              <input type="file" accept="image/*" onChange={handleProfileFile} className="text-sm text-slate-600" />
            </div>
          </div>
          <input type="email" name="email" value={form.email} onChange={handleChange} placeholder={t("register.email")} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-400" required />
          <input type="password" name="password" value={form.password} onChange={handleChange} placeholder={t("register.password")} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-400" required />
          <select name="role" value={form.role} onChange={handleRoleChange} className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-400">
            <option value="admin">{t("register.roleAdmin")}</option>
            <option value="driver">{t("register.roleDriver")}</option>
          </select>
          {form.role === "driver" ? (
            <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div>
                <p className="text-sm font-semibold text-emerald-900">{t("register.driverVerification")}</p>
                <p className="mt-1 text-sm text-emerald-800">{t("register.driverVerificationHelp")}</p>
              </div>
              <input
                type="text"
                name="aadhar_id"
                value={form.aadhar_id}
                onChange={handleChange}
                placeholder={t("register.aadharId")}
                className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                required
              />
              <input
                type="text"
                name="license_id"
                value={form.license_id}
                onChange={handleChange}
                placeholder={t("register.licenseId")}
                className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
                required
              />
              <label className="block rounded-2xl border border-emerald-200 bg-white p-4 text-sm text-slate-700">
                <span className="mb-2 block font-medium text-slate-900">{t("register.aadharFile")}</span>
                <input type="file" accept="image/*,.pdf" onChange={handleDocumentFile("aadhar_file_url")} className="text-sm text-slate-600" required />
                {form.aadhar_file_url ? <span className="mt-2 block text-emerald-700">{t("register.fileSelected")}</span> : null}
              </label>
              <label className="block rounded-2xl border border-emerald-200 bg-white p-4 text-sm text-slate-700">
                <span className="mb-2 block font-medium text-slate-900">{t("register.licenseFile")}</span>
                <input type="file" accept="image/*,.pdf" onChange={handleDocumentFile("license_file_url")} className="text-sm text-slate-600" required />
                {form.license_file_url ? <span className="mt-2 block text-emerald-700">{t("register.fileSelected")}</span> : null}
              </label>
            </div>
          ) : null}
          <button type="submit" disabled={loading} className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70">
            {loading ? t("register.submitting") : t("register.submit")}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          {t("register.hasAccount")}{" "}
          <Link to="/login" state={{ role: form.role, from: location.state?.from }} className="font-semibold text-emerald-700">{t("login.login")}</Link>
        </p>
      </div>
    </div>
  );
}
