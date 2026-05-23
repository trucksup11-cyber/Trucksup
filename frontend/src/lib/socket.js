import { io } from "socket.io-client";

let socket;

export function getSocket() {
  if (socket) {
    return socket;
  }

  const token = localStorage.getItem("token");
  if (!token) {
    return null;
  }

  const apiUrl = import.meta.env.VITE_API_URL;
  const derivedBase =
    apiUrl && apiUrl.startsWith("http")
      ? apiUrl.replace(/\/api\/?$/, "")
      : window.location.origin;
  const base = import.meta.env.VITE_SOCKET_URL || derivedBase;
  socket = io(base, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    auth: { token }
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
