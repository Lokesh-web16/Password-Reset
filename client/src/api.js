// Centralized API helper. Reads the backend base URL from the Vite env var so
// the same build works locally and on Render/Netlify just by changing config.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Thin wrapper around fetch that always sends/expects JSON and throws an Error
 * with the server's message when the response is not ok.
 */
async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    // Non-JSON response (e.g. network/proxy error) — leave data empty.
  }

  if (!res.ok) {
    throw new Error(data.message || "Request failed. Please try again.");
  }
  return data;
}

export const registerUser = (name, email, password) =>
  request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });

export const requestPasswordReset = (email) =>
  request("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const verifyResetToken = (token) =>
  request(`/api/auth/verify-token/${token}`, { method: "GET" });

export const submitNewPassword = (token, password) =>
  request(`/api/auth/reset-password/${token}`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });

export const seedDemoUser = (name, email, password) =>
  request("/api/auth/seed", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
