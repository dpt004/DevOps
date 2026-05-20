export function todayISO(now = new Date()) {
  const offset = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function startOfMonthISO(now = new Date()) {
  return `${todayISO(now).slice(0, 8)}01`;
}

/** 1 = Thứ 2 … 7 = Chủ nhật (ISO weekday) */
export function isoDayOfWeek(now = new Date()) {
  const jsDay = now.getDay();
  return jsDay === 0 ? 7 : jsDay;
}

/** Ngày ISO trong tuần hiện tại cho thứ `dayOfWeek` (1–7). */
export function dateForWeekday(dayOfWeek, now = new Date()) {
  const current = isoDayOfWeek(now);
  const diff = Number(dayOfWeek) - current;
  const target = new Date(now);
  target.setDate(target.getDate() + diff);
  return todayISO(target);
}
