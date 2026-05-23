import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "../components/ProtectedRoute";
import AdminDashboard from "../pages/admin/AdminDashboard";
import Loads from "../pages/admin/Loads";
import TruckMap from "../pages/admin/TruckMap";
import Trucks from "../pages/admin/Trucks";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import DriverDashboard from "../pages/driver/DriverDashboard";
import DriverLoads from "../pages/driver/DriverLoads";
import DriverTrucks from "../pages/driver/DriverTrucks";
import Home from "../pages/Home";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/trucks" element={<Trucks />} />
      <Route path="/admin/loads" element={<Loads />} />
      <Route path="/admin/map" element={<TruckMap />} />

      <Route
        path="/driver"
        element={
          <ProtectedRoute>
            <DriverDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/driver/loads"
        element={
          <ProtectedRoute>
            <DriverLoads />
          </ProtectedRoute>
        }
      />
      <Route
        path="/driver/trucks"
        element={
          <ProtectedRoute>
            <DriverTrucks />
          </ProtectedRoute>
        }
      />

      <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
