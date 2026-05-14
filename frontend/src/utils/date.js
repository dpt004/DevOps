export function todayISO(now = new Date()) {
  const offset = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function startOfMonthISO(now = new Date()) {
  return `${todayISO(now).slice(0, 8)}01`;
}
