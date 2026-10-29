// All backend calls go through /api (Caddy in production, Vite proxy locally).
const BASE = "/api";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function errorMessage(data, status) {
  const detail = data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg).join(", ");
  if (status === 413) return "File is too large (max 10 MB)";
  return `Request failed (${status})`;
}

async function request(path, { token, method = "GET", json, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  }

  const res = await fetch(BASE + path, { method, headers, body });
  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, errorMessage(data, res.status));
  return data;
}

export const api = {
  register: (email, password) =>
    request("/auth/register", { method: "POST", json: { email, password } }),

  // The login endpoint expects form fields named "username" and "password"
  login: (email, password) =>
    request("/auth/login", {
      method: "POST",
      body: new URLSearchParams({ username: email, password }),
    }),

  listTasks: (token) => request("/tasks", { token }),

  createTask: (token, task) =>
    request("/tasks", { token, method: "POST", json: task }),

  updateTask: (token, id, changes) =>
    request(`/tasks/${id}`, { token, method: "PATCH", json: changes }),

  deleteTask: (token, id) =>
    request(`/tasks/${id}`, { token, method: "DELETE" }),

  uploadFile: (token, id, file) => {
    const form = new FormData();
    form.append("file", file);
    return request(`/tasks/${id}/upload`, { token, method: "POST", body: form });
  },
};
