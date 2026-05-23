import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import DriverLayout from "../../components/layout/DriverLayout";
import { useLanguage } from "../../contexts/LanguageContext";
import api from "../../lib/api";

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

const emptyForm = {
  truck_number: "",
  capacity: "",
  status: "Available"
};

const statusKey = (status) => {
  if (status === "On Delivery") return "status.onDelivery";
  if (status === "In Transit" || status === "In Order") return "status.inTransit";
  return `status.${String(status || "available").toLowerCase()}`;
};

export default function DriverTrucks() {
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);
  const [trucks, setTrucks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const { t, formatNumber } = useLanguage();

  const fetchMyTrucks = async () => {
    try {
      const response = await api.get("/trucks?mine=1");
      setTrucks(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || t("toast.trucksLoadFailed"));
    }
  };

  useEffect(() => {
    fetchMyTrucks();
  }, [t]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      ...form,
      driver: user?.fullName || user?.email || t("driver"),
      driver_phone: user?.phone || "",
      driver_user_id: user?.id
    };

    try {
      if (editingId) {
        await api.put(`/trucks/${editingId}`, payload);
        toast.success(t("toast.truckUpdated"));
      } else {
        await api.post("/trucks", payload);
        toast.success(t("toast.truckAdded"));
      }

      resetForm();
      fetchMyTrucks();
    } catch (error) {
      toast.error(error.response?.data?.message || t("toast.truckSaveFailed"));
    }
  };

  const handleEdit = (truck) => {
    setEditingId(truck.id);
    setForm({
      truck_number: truck.truckNumber,
      capacity: String(truck.capacity),
      status: truck.status
    });
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/trucks/${id}`);
      toast.success(t("toast.truckDeleted"));

      if (editingId === id) {
        resetForm();
      }

      fetchMyTrucks();
    } catch (error) {
      toast.error(error.response?.data?.message || t("toast.truckDeleteFailed"));
    }
  };

  return (
    <DriverLayout>
      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[1.75rem] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold">{editingId ? t("driver.editMyTruck") : t("driver.addMyTruck")}</h2>
          <p className="mt-2 text-slate-600">{t("driver.autoLink")}: {user?.fullName || user?.email} {user?.phone ? `• ${user.phone}` : ""}</p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <input name="truck_number" value={form.truck_number} onChange={handleChange} placeholder={t("admin.truckNumber")} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-400" required />
            <input name="capacity" type="number" min="0" step="0.1" value={form.capacity} onChange={handleChange} placeholder={t("admin.capacityTons")} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-400" required />
            <select name="status" value={form.status} onChange={handleChange} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-400">
              <option value="Available">{t("status.available")}</option>
              <option value="On Delivery">{t("status.onDelivery")}</option>
              <option value="Maintenance">{t("status.maintenance")}</option>
            </select>
            <button type="submit" className="sm:col-span-2 rounded-2xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700">
              {editingId ? t("admin.updateTruck") : t("driver.addMyTruck")}
            </button>
          </form>
        </section>

        <section className="rounded-[1.75rem] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{t("driver.myTrucks")}</h2>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">{formatNumber(trucks.length)}</span>
          </div>

          <div className="mt-6 grid gap-4">
            {trucks.map((truck) => (
              <article key={truck.id} className="rounded-[1.5rem] border border-slate-200 p-5">
                <div className="flex items-center gap-4">
                  <img src={truck.driverAvatarUrl || user?.profilePhotoUrl || DEFAULT_AVATAR} alt={truck.driver} className="h-14 w-14 rounded-full object-cover" />
                  <div>
                    <p className="text-xl font-bold text-slate-900">{truck.truckNumber}</p>
                    <p className="text-sm text-slate-600">{t("driver")}: {truck.driver}</p>
                    <p className="text-sm text-slate-500">{t("phone")}: {truck.driverPhone || user?.phone || t("common.notProvided")}</p>
                    <p className="text-sm text-slate-500">{t("admin.capacity")}: {formatNumber(truck.capacity)} {t("admin.tons")}</p>
                  </div>
                  <span className="ml-auto rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">{t(statusKey(truck.status))}</span>
                </div>

                <div className="mt-4 flex gap-3">
                  <button onClick={() => handleEdit(truck)} className="rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-200">{t("common.edit")}</button>
                  <button onClick={() => handleDelete(truck.id)} className="rounded-full bg-rose-100 px-4 py-2 text-sm font-medium text-rose-900 transition hover:bg-rose-200">{t("common.delete")}</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </DriverLayout>
  );
}
