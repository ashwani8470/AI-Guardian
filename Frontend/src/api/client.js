// Central API client for the AI Guardian FastAPI backend.
// Edit BASE_URL to match wherever your backend is running.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function getToken() {
  return localStorage.getItem("ag_token");
}

async function request(path, { method = "GET", body, isForm = false, auth = true } = {}) {
  const headers = {};
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
  } catch (e) {
    // no JSON body
  }

  if (!res.ok) {
    const message = (data && (data.detail || data.message)) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  signup: (payload) => request("/auth/signup", { method: "POST", body: payload, auth: false }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),

  predictText: (content) => request("/predict/text", { method: "POST", body: { content } }),
  predictUrl: (url) => request("/predict/url", { method: "POST", body: { url } }),
  predictEmail: (payload) => request("/predict/email", { method: "POST", body: payload }),

  // Image-based endpoints — sent as base64 strings to match the backend contract.
  predictQr: (imageBase64) => request("/predict/qr", { method: "POST", body: { image_base64: imageBase64 } }),
  predictScreenshot: (imageBase64) =>
    request("/predict/screenshot", { method: "POST", body: { image_base64: imageBase64 } }),

  getHistory: () => request("/scans", { method: "GET" }),
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

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
