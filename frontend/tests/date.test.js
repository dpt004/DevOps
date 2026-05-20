import test from "node:test";
import assert from "node:assert/strict";
import {
  dateForWeekday,
  isoDayOfWeek,
  startOfMonthISO,
  todayISO,
} from "../src/utils/date.js";

test("todayISO returns yyyy-mm-dd in local time", () => {
  const value = todayISO(new Date("2026-05-20T12:00:00"));
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/);
});

test("startOfMonthISO returns the first day of the current month", () => {
  assert.equal(
    startOfMonthISO(new Date("2026-05-20T12:00:00")),
    "2026-05-01",
  );
});

test("isoDayOfWeek uses Monday=1 … Sunday=7", () => {
  assert.equal(isoDayOfWeek(new Date("2026-05-18T12:00:00")), 1);
  assert.equal(isoDayOfWeek(new Date("2026-05-24T12:00:00")), 7);
});

test("dateForWeekday returns ISO date in current week", () => {
  const wednesday = new Date("2026-05-20T12:00:00");
  assert.equal(dateForWeekday(1, wednesday), "2026-05-18");
  assert.equal(dateForWeekday(3, wednesday), "2026-05-20");
});
