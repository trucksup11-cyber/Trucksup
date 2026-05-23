export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export function getDashboardPath(user = getStoredUser()) {
  return user?.role === "driver" ? "/driver" : "/admin";
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem("token"));
}
