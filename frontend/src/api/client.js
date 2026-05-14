const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const SESSION_KEY = "attendance.session";

export function getStoredSession() {
  const raw = window.localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setStoredSession(session) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

async function request(path, options = {}) {
  const session = getStoredSession();
  const headers = new Headers(options.headers || {});

  if (session?.token) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.message || "Request failed.");
    error.status = response.status;
    throw error;
  }

  return payload.data ?? payload;
}

function queryString(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  }
  const value = search.toString();
  return value ? `?${value}` : "";
}

export function login(username, password) {
  return request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
}

export function logout() {
  return request("/auth/logout", {
    method: "POST",
  });
}

export function getHealth() {
  return request("/health");
}

export function getClasses() {
  return request("/classes");
}

export function createClass(payload) {
  return request("/classes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateClass(payload) {
  return request(`/classes/${payload.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteClass(id) {
  return request(`/classes/${id}`, {
    method: "DELETE",
  });
}

export function getStudents(params = {}) {
  return request(`/students${queryString(params)}`);
}

export function createStudent(student) {
  return request("/students", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(student),
  });
}

export function updateStudent(student) {
  return request(`/students/${student.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(student),
  });
}

export function deleteStudent(id) {
  return request(`/students/${id}`, {
    method: "DELETE",
  });
}

export function importStudents(file, className) {
  const form = new FormData();
  form.append("file", file);
  form.append("className", className);

  return request("/students/import", {
    method: "POST",
    body: form,
  });
}

export function getAttendance(params) {
  return request(`/attendance${queryString(params)}`);
}

export function saveAttendance(date, className, records) {
  return request("/attendance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, className, records }),
  });
}

export function lockAttendance(date, className) {
  return request("/attendance/lock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, className }),
  });
}

export function getStats(params) {
  return request(`/stats${queryString(params)}`);
}

export async function downloadAttendanceReport(params) {
  const session = getStoredSession();
  const headers = new Headers();

  if (session?.token) {
    headers.set("Authorization", `Bearer ${session.token}`);
  }

  const response = await fetch(
    `${API_BASE_URL}/reports/attendance.csv${queryString(params)}`,
    { headers },
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.message || "Request failed.");
    error.status = response.status;
    throw error;
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "attendance-report.csv";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}
