import { Navigate, useLocation } from "react-router-dom";

import { getDashboardPath, getStoredUser } from "../lib/auth";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  const location = useLocation();

  if (!token) {
    const isDriverRoute = location.pathname.startsWith("/driver");
    const role = isDriverRoute ? "driver" : "admin";
    return <Navigate to="/register" replace state={{ from: location.pathname, role }} />;
  }

  const user = getStoredUser();
  if (user?.role === "driver" && !location.pathname.startsWith("/driver")) {
    return <Navigate to={getDashboardPath(user)} replace />;
  }

  return children;
}
