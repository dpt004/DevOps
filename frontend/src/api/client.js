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

export function getStudents() {
  return request("/students");
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

export function importStudents(file) {
  const form = new FormData();
  form.append("file", file);

  return request("/students/import", {
    method: "POST",
    body: form,
  });
}

export function getAttendance(date) {
  return request(`/attendance?date=${encodeURIComponent(date)}`);
}

export function saveAttendance(date, records) {
  return request("/attendance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, records }),
  });
}

export function getStats(from, to) {
  return request(
    `/stats?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
}
