import assert from "node:assert/strict";
import test from "node:test";
import { startOfMonthISO, todayISO } from "../src/utils/date.js";

test("todayISO returns yyyy-mm-dd in local time", () => {
  const date = new Date("2026-05-14T10:20:30.000Z");
  assert.match(todayISO(date), /^\d{4}-\d{2}-\d{2}$/);
});

test("startOfMonthISO returns the first day of the current month", () => {
  const date = new Date("2026-05-14T10:20:30.000Z");
  assert.equal(startOfMonthISO(date).slice(-2), "01");
});
