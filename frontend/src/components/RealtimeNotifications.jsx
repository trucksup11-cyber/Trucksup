import { useEffect } from "react";
import toast from "react-hot-toast";
import { useLocation } from "react-router-dom";

import { useLanguage } from "../contexts/LanguageContext";
import { getSocket } from "../lib/socket";

export default function RealtimeNotifications() {
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    const socket = getSocket();
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!socket) {
      return undefined;
    }

    const onLoadAccepted = ({ load }) => {
      if (user?.role === "admin") {
        const driverName = load.assignedDriver?.name || t("driver");
        const driverPhone = load.assignedDriver?.phone ? ` (${load.assignedDriver.phone})` : "";
        const shipmentName = load.shipmentName || t("shipment");
        toast.success(`${driverName}${driverPhone} ${t("notifications.acceptedLoad")} ${shipmentName} ${load.referenceNumber || `#${load.id}`}.`);
      }
    };

    const onNewNearbyLoad = ({ load }) => {
      toast((toastItem) => (
        <div className="space-y-1">
          <p className="font-semibold">{t("availableLoads")}</p>
          <p className="text-sm text-slate-700">{load.pickup} {t("common.to")} {load.dropLocation}</p>
          <button onClick={() => toast.dismiss(toastItem.id)} className="text-xs text-cyan-700">{t("common.cancel")}</button>
        </div>
      ));
    };

    const onLoadCreated = ({ load }) => {
      const nextUser = JSON.parse(localStorage.getItem("user") || "null");
      if (nextUser?.role === "admin") {
        toast.success(`${t("notifications.newLoadCreated")}: ${load.pickup} ${t("common.to")} ${load.dropLocation}`);
      }
    };

    socket.on("load_accepted", onLoadAccepted);
    socket.on("new_nearby_load", onNewNearbyLoad);
    socket.on("load_created", onLoadCreated);

    return () => {
      socket.off("load_accepted", onLoadAccepted);
      socket.off("new_nearby_load", onNewNearbyLoad);
      socket.off("load_created", onLoadCreated);
    };
  }, [location.pathname, t]);

  return null;
}
