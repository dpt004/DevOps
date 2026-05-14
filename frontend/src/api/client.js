const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || "Request failed.");
  }

  return payload.data ?? payload;
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
