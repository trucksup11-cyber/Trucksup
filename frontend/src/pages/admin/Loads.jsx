import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import AdminLayout from "../../components/layout/AdminLayout";
import { useLanguage } from "../../contexts/LanguageContext";
import api from "../../lib/api";
import { getSocket } from "../../lib/socket";

const emptyForm = {
  pickup: "",
  drop_location: "",
  shipment_name: "",
  shipment_phone: "",
  shipment_address: "",
  reference_number: "",
  weight: "",
  price: "",
  status: "Available"
};

const statusKey = (status) => {
  if (status === "On Delivery") return "status.onDelivery";
  if (status === "In Transit" || status === "In Order") return "status.inTransit";
  return `status.${String(status || "available").toLowerCase()}`;
};

export default function Loads() {
  const [loads, setLoads] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const { t, formatNumber, formatCurrency } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = Boolean(localStorage.getItem("token"));

  const fetchLoads = async () => {
    try {
      const response = await api.get("/loads");
      setLoads(response.data);
    } catch (error) {
      toast.error(error.response?.data?.message || t("toast.loadsLoadFailed"));
    }
  };

  useEffect(() => {
    fetchLoads();
  }, [t]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) {
      return undefined;
    }

    const onLoadRefresh = ({ load }) => {
      if (load?.assignedDriver) {
        toast.success(`${load.assignedDriver.name || t("driver")} ${t("admin.acceptedShipment")} ${load.referenceNumber || `#${load.id}`}.`);
      }
      fetchLoads();
    };

    const onDeleted = () => fetchLoads();

    socket.on("load_accepted", onLoadRefresh);
    socket.on("load_status_updated", onLoadRefresh);
    socket.on("load_created", onLoadRefresh);
    socket.on("load_deleted", onDeleted);
    socket.on("load_truck_location_updated", onLoadRefresh);

    return () => {
      socket.off("load_accepted", onLoadRefresh);
      socket.off("load_status_updated", onLoadRefresh);
      socket.off("load_created", onLoadRefresh);
      socket.off("load_deleted", onDeleted);
      socket.off("load_truck_location_updated", onLoadRefresh);
    };
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
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isLoggedIn) {
      sendGuestToRegister();
      return;
    }

    try {
      if (editingId) {
        await api.put(`/loads/${editingId}`, form);
        toast.success(t("toast.loadUpdated"));
      } else {
        await api.post("/loads", form);
        toast.success(t("toast.loadAdded"));
      }
      resetForm();
      fetchLoads();
    } catch (error) {
      toast.error(error.response?.data?.message || t("toast.loadSaveFailed"));
    }
  };

  const handleEdit = (load) => {
    if (!isLoggedIn) {
      sendGuestToRegister();
      return;
    }

    setEditingId(load.id);
    setForm({
      pickup: load.pickup || "",
      drop_location: load.dropLocation || "",
      shipment_name: load.shipmentName || "",
      shipment_phone: load.shipmentPhone || "",
      shipment_address: load.shipmentAddress || "",
      reference_number: load.referenceNumber || "",
      weight: String(load.weight || ""),
      price: String(load.price || ""),
      status: load.status || "Available"
    });
  };

  const handleDelete = async (loadId) => {
    if (!isLoggedIn) {
      sendGuestToRegister();
      return;
    }

    try {
      await api.delete(`/loads/${loadId}`);
      toast.success(t("toast.loadDeleted"));
      if (editingId === loadId) {
        resetForm();
      }
      fetchLoads();
    } catch (error) {
      toast.error(error.response?.data?.message || t("toast.loadDeleteFailed"));
    }
  };

  const trackedLoads = useMemo(() => loads.filter((load) => load.assignedDriver), [loads]);

  return (
    <AdminLayout>
      <div className="grid gap-8 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-[1.75rem] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{editingId ? t("admin.updateLoad") : t("addLoad")}</h2>
            {editingId ? (
              <button onClick={resetForm} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">{t("common.cancel")}</button>
            ) : null}
          </div>
          <p className="mt-2 text-slate-600">{isLoggedIn ? t("admin.createLoadsPrompt") : t("admin.readOnlyPrompt")}</p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <input disabled={!isLoggedIn} name="pickup" value={form.pickup} onChange={handleChange} placeholder={t("admin.pickup")} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-100" required />
            <input disabled={!isLoggedIn} name="drop_location" value={form.drop_location} onChange={handleChange} placeholder={t("admin.drop")} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-100" required />
            <input disabled={!isLoggedIn} name="reference_number" value={form.reference_number} onChange={handleChange} placeholder={t("admin.reference")} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-100" />
            <input disabled={!isLoggedIn} name="shipment_name" value={form.shipment_name} onChange={handleChange} placeholder={t("admin.shipmentCompany")} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-100" />
            <input disabled={!isLoggedIn} name="shipment_phone" value={form.shipment_phone} onChange={handleChange} placeholder={t("admin.shipmentContact")} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-100" />
            <input disabled={!isLoggedIn} name="shipment_address" value={form.shipment_address} onChange={handleChange} placeholder={t("admin.shipmentAddress")} className="sm:col-span-2 rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-100" />
            <input disabled={!isLoggedIn} name="weight" type="number" min="0" step="0.1" value={form.weight} onChange={handleChange} placeholder={t("admin.weight")} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-100" required />
            <input disabled={!isLoggedIn} name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} placeholder={t("admin.price")} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-100" required />
            <button type="submit" className="sm:col-span-2 rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400">
              {isLoggedIn ? (editingId ? t("admin.updateLoad") : t("admin.addLoadNotify")) : t("admin.registerToManage")}
            </button>
          </form>
        </section>

        <section className="rounded-[1.75rem] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{t("currentLoads")}</h2>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">{formatNumber(loads.length)} {t("loads")}</span>
          </div>

          <div className="mt-6 space-y-4 max-h-[75vh] overflow-y-auto pr-2">
            {loads.map((load) => (
              <article key={load.id} className="rounded-[1.5rem] border border-slate-200 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-bold text-slate-900">{load.pickup} {"->"} {load.dropLocation}</p>
                    <p className="mt-1 text-sm text-slate-600">{formatNumber(load.weight)} {t("admin.tons")} - {formatCurrency(load.price)}</p>
                    <p className="mt-1 text-sm text-slate-600">{t("admin.ref")}: {load.referenceNumber || `LD-${load.id}`}</p>
                    <p className="mt-1 text-sm text-slate-600">{t("admin.pickupCity")}: {load.pickup}</p>
                    <p className="mt-1 text-sm text-slate-600">{t("shipment")}: {load.shipmentName || t("common.notProvided")} {load.shipmentPhone ? `(${load.shipmentPhone})` : ""}</p>
                  </div>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">{t(statusKey(load.status))}</span>
                </div>

                {load.assignedDriver ? (
                  <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                    <p className="font-semibold">{t("driver")}: {load.assignedDriver.name || t("driver")}</p>
                    <p>{t("phone")}: {load.assignedDriver.phone || t("common.notProvided")}</p>
                    <p>{t("trucks")}: {load.assignedDriver.truckNumber || t("common.notAvailable")}</p>
                    <p>{t("driver.currentCity")}: {load.assignedDriver.currentCity || t("common.unknown")}</p>
                    <p>{t("tracking")}: {load.assignedDriver.latitude}, {load.assignedDriver.longitude}</p>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-3">
                  <button onClick={() => handleEdit(load)} className="rounded-full bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-200">{isLoggedIn ? t("common.edit") : t("admin.unlockEdit")}</button>
                  <button onClick={() => handleDelete(load.id)} className="rounded-full bg-rose-100 px-4 py-2 text-sm font-medium text-rose-900 transition hover:bg-rose-200">{isLoggedIn ? t("common.delete") : t("admin.unlockDelete")}</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-[1.75rem] bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">{t("admin.liveTrackingSummary")}</h3>
        <p className="mt-2 text-slate-600">{t("admin.liveTrackingSub")}</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {trackedLoads.map((load) => (
            <div key={load.id} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
              <p className="font-semibold">{load.referenceNumber || `#${load.id}`} - {load.pickup} {"->"} {load.dropLocation}</p>
              <p>{t("driver")}: {load.assignedDriver?.name || t("common.notAvailable")}</p>
              <p>{t("tracking")}: {load.assignedDriver?.latitude || "-"}, {load.assignedDriver?.longitude || "-"}</p>
            </div>
          ))}
          {trackedLoads.length === 0 ? <p className="text-slate-600">{t("admin.noAssignedLoads")}</p> : null}
        </div>
      </section>
    </AdminLayout>
  );
}
