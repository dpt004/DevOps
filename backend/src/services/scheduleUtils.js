export function timeToMinutes(value) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) {
    throw Object.assign(new Error("Giờ học phải có định dạng HH:MM."), {
      statusCode: 400,
    });
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    throw Object.assign(new Error("Giờ học không hợp lệ."), {
      statusCode: 400,
    });
  }

  return hours * 60 + minutes;
}

export function normalizeTime(value) {
  const minutes = timeToMinutes(value);
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mins = String(minutes % 60).padStart(2, "0");
  return `${hours}:${mins}`;
}

export function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}
