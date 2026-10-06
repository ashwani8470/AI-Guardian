// Central API client for the AI Guardian FastAPI backend.
// Edit BASE_URL to match wherever your backend is running.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function getToken() {
  return localStorage.getItem("ag_token");
}

export const SESSION_EXPIRED_EVENT = "ag:session-expired";

export class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Random id that identifies this browser in sample (guest) mode, so the server
// can count the free scans. It is kept even after login/logout on purpose.
export function getGuestId() {
  try {
    let id = localStorage.getItem("ag_guest_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("ag_guest_id", id);
    }
    return id;
  } catch {
    return "guest-no-storage-0000";
  }
}

async function request(path, { method = "GET", body, isForm = false, auth = true, guest = false } = {}) {
  const headers = {};
  if (guest) headers["X-Guest-Id"] = getGuestId();
  if (!isForm) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    // An expired/invalid login token: drop it and tell the app, which sends the
    // user back to the login page. (Wrong-password errors on /auth/login have
    // auth:false and are shown on the form instead.)
    if (res.status === 401 && auth && getToken()) {
      clearToken();
      clearStoredUser();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      throw new HttpError("Your session has expired. Please log in again.", 401);
    }
    const detail = data && (data.detail || data.message);
    // FastAPI validation errors come back as a list of objects.
    const message =
      typeof detail === "string" ? detail : detail ? "Please check what you entered and try again." : `Request failed (${res.status})`;
    throw new HttpError(message, res.status);
  }
  return data;
}

export const api = {
  signup: (payload) => request("/auth/signup", { method: "POST", body: payload, auth: false }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),
  forgotPassword: (email) =>
    request("/auth/forgot-password", { method: "POST", body: { email }, auth: false }),
  resetPassword: (token, newPassword) =>
    request("/auth/reset-password", {
      method: "POST",
      body: { token, new_password: newPassword },
      auth: false,
    }),

  getProfile: () => request("/auth/me", { method: "GET" }),
  updateProfile: (payload) => request("/auth/profile", { method: "PUT", body: payload }),

  predictText: (content) => request("/predict/text", { method: "POST", body: { content } }),
  predictUrl: (url) => request("/predict/url", { method: "POST", body: { url } }),
  predictEmail: (payload) => request("/predict/email", { method: "POST", body: payload }),

  // Image-based endpoints — sent as base64 strings to match the backend contract.
  predictQr: (imageBase64) => request("/predict/qr", { method: "POST", body: { image_base64: imageBase64 } }),
  predictScreenshot: (imageBase64) =>
    request("/predict/screenshot", { method: "POST", body: { image_base64: imageBase64 } }),

  // Sample (guest) mode - no login; only the server's preset examples can be scanned.
  demoExamples: () => request("/demo/examples", { auth: false }),
  demoStatus: () => request("/demo/status", { auth: false, guest: true }),
  demoScan: (modality, exampleId) =>
    request("/demo/scan", {
      method: "POST",
      body: { modality, example_id: exampleId },
      auth: false,
      guest: true,
    }),

  getHistory: () => request("/scans", { method: "GET" }),
  deleteHistory: () => request("/scans", { method: "DELETE" }),
  deleteAccount: (password) =>
    request("/auth/delete-account", { method: "POST", body: { password } }),

  // CSV download needs the auth header, so it is fetched as a blob (a plain
  // <a href> link can't send the token).
  async downloadHistoryCsv() {
    const res = await fetch(`${BASE_URL}/scans/export`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) throw new HttpError(`Download failed (${res.status})`, res.status);
    return res.blob();
  },
};

export function setToken(token) {
  localStorage.setItem("ag_token", token);
}

export function clearToken() {
  localStorage.removeItem("ag_token");
}

export function hasToken() {
  return !!getToken();
}

// Lightweight local profile cache (name/email) so the "My Account" page has
// something to show without needing a dedicated /auth/me backend endpoint.
// Populated from whatever the signup form collected, at login/signup time.
export function setStoredUser(user) {
  localStorage.setItem("ag_user", JSON.stringify(user));
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("ag_user")) || null;
  } catch {
    return null;
  }
}

export function clearStoredUser() {
  localStorage.removeItem("ag_user");
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
