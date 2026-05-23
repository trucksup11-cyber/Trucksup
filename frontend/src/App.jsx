import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import RealtimeNotifications from "./components/RealtimeNotifications";
import { LanguageProvider } from "./contexts/LanguageContext";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <RealtimeNotifications />
        <AppRoutes />
        <Toaster position="top-right" />
      </BrowserRouter>
    </LanguageProvider>
  );
}
