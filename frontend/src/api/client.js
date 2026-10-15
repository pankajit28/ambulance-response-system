const API_BASE = "/api";

export function getToken() {
  return localStorage.getItem("ears_token");
}

export function setSession(token, user) {
  if (token) localStorage.setItem("ears_token", token);
  if (user) localStorage.setItem("ears_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("ears_token");
  localStorage.removeItem("ears_user");
}

export async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Cannot reach the API. Start the backend with npm run dev in the backend folder.");
  }

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!res.ok) {
    throw new Error(
      data.message ||
        (res.status === 500
          ? "Backend error. Make sure the API is running on port 5000."
          : `Request failed (${res.status})`)
    );
  }
  return data;
}
