import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import AdminLayout from "../../components/layout/AdminLayout";
import { useLanguage } from "../../contexts/LanguageContext";
import api from "../../lib/api";

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

const emptyForm = {
  driver: "",
  driver_phone: "",
  driver_user_id: "",
  truck_number: "",
  capacity: "",
  status: "Available"
};

const statusKey = (status) => {
  if (status === "On Delivery") return "status.onDelivery";
  if (status === "In Transit" || status === "In Order") return "status.inTransit";
  return `status.${String(status || "available").toLowerCase()}`;
};

export default function Trucks() {
  const [trucks, setTrucks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const { t, formatNumber } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = Boolean(localStorage.getItem("token"));

  const fetchTrucks = async () => {
    try {
      const response = await api.get("/trucks");
      setTrucks(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || t("toast.trucksLoadFailed"));
    }
  };

  useEffect(() => {
    fetchTrucks();
  }, [t]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const sendGuestToRegister = () => {
    toast(t("admin.authRequiredAction"));
    navigate("/register", { state: { from: location.pathname } });
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isLoggedIn) {
      sendGuestToRegister();
      return;
    }

    try {
      if (editingId) {
        await api.put(`/trucks/${editingId}`, form);
        toast.success(t("toast.truckUpdated"));
      } else {
        await api.post("/trucks", form);
        toast.success(t("toast.truckAdded"));
      }

      resetForm();
      fetchTrucks();
    } catch (error) {
      toast.error(error.response?.data?.message || t("toast.truckSaveFailed"));
    }
  };

  const handleEdit = (truck) => {
    if (!isLoggedIn) {
      sendGuestToRegister();
      return;
    }

    setEditingId(truck.id);
    setForm({
      driver: truck.driver,
      driver_phone: truck.driverPhone || "",
      driver_user_id: truck.driverUserId ? String(truck.driverUserId) : "",
      truck_number: truck.truckNumber,
      capacity: String(truck.capacity),
      status: truck.status
    });
  };

  const handleDelete = async (id) => {
    if (!isLoggedIn) {
      sendGuestToRegister();
      return;
    }

    try {
      await api.delete(`/trucks/${id}`);
      toast.success(t("toast.truckDeleted"));

      if (editingId === id) {
        resetForm();
      }

      fetchTrucks();
    } catch (error) {
      toast.error(error.response?.data?.message || t("toast.truckDeleteFailed"));
    }
  };

  return (
    <AdminLayout>
      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[1.75rem] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{editingId ? t("admin.editTruck") : t("admin.addTruck")}</h2>
            {editingId ? (
              <button onClick={resetForm} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                {t("common.cancel")}
              </button>
            ) : null}
          </div>
          {!isLoggedIn ? <p className="mt-2 text-slate-600">{t("admin.readOnlyPrompt")}</p> : null}

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <input disabled={!isLoggedIn} name="driver" value={form.driver} onChange={handleChange} placeholder={t("admin.driverName")} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-100" required />
            <input disabled={!isLoggedIn} name="truck_number" value={form.truck_number} onChange={handleChange} placeholder={t("admin.truckNumber")} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-100" required />
            <input disabled={!isLoggedIn} name="driver_phone" value={form.driver_phone} onChange={handleChange} placeholder={t("admin.driverPhone")} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-100" />
            <input disabled={!isLoggedIn} name="driver_user_id" type="number" min="1" value={form.driver_user_id} onChange={handleChange} placeholder={t("admin.driverUserId")} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-100" />
            <input disabled={!isLoggedIn} name="capacity" type="number" min="0" step="0.1" value={form.capacity} onChange={handleChange} placeholder={t("admin.capacityTons")} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-100" required />
            <select disabled={!isLoggedIn} name="status" value={form.status} onChange={handleChange} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-100">
              <option value="Available">{t("status.available")}</option>
              <option value="On Delivery">{t("status.onDelivery")}</option>
              <option value="Maintenance">{t("status.maintenance")}</option>
            </select>
            <button type="submit" className="sm:col-span-2 rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400">
              {isLoggedIn ? (editingId ? t("admin.updateTruck") : t("admin.addTruck")) : t("admin.registerToManage")}
            </button>
          </form>
        </section>

        <section className="rounded-[1.75rem] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{t("fleetList")}</h2>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">{formatNumber(trucks.length)} {t("trucks")}</span>
          </div>

          <div className="mt-6 grid gap-4">
            {trucks.map((truck) => (
              <article key={truck.id} className="rounded-[1.5rem] border border-slate-200 p-5 transition hover:border-cyan-300">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-center gap-4">
                    <img src={truck.driverAvatarUrl || DEFAULT_AVATAR} alt={truck.driver} className="h-14 w-14 rounded-full object-cover" />
                    <div>
                      <p className="text-xl font-bold text-slate-900">{truck.truckNumber}</p>
                      <p className="mt-1 text-slate-600">{truck.driver}</p>
                      <p className="mt-1 text-sm text-slate-500">{t("admin.phoneLabel")}: {truck.driverPhone || t("common.notProvided")}</p>
                      <p className="mt-1 text-sm text-slate-500">{t("admin.capacity")}: {formatNumber(truck.capacity)} {t("admin.tons")}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">{t(statusKey(truck.status))}</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button onClick={() => handleEdit(truck)} className="rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-200">{isLoggedIn ? t("common.edit") : t("admin.unlockEdit")}</button>
                  <button onClick={() => handleDelete(truck.id)} className="rounded-full bg-rose-100 px-4 py-2 text-sm font-medium text-rose-900 transition hover:bg-rose-200">{isLoggedIn ? t("common.delete") : t("admin.unlockDelete")}</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
