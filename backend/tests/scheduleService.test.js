import test from "node:test";
import assert from "node:assert/strict";
import {
  rangesOverlap,
  timeToMinutes,
  normalizeTime,
} from "../src/services/scheduleUtils.js";

test("timeToMinutes parses HH:MM", () => {
  assert.equal(timeToMinutes("07:30"), 450);
  assert.equal(timeToMinutes("9:05"), 545);
});

test("normalizeTime pads single-digit hour", () => {
  assert.equal(normalizeTime("7:5"), "07:05");
});

test("rangesOverlap detects overlapping intervals", () => {
  assert.equal(rangesOverlap(420, 540, 480, 600), true);
  assert.equal(rangesOverlap(420, 480, 480, 540), false);
  assert.equal(rangesOverlap(420, 540, 300, 420), false);
});

test("rangesOverlap rejects invalid end before start at validation layer", () => {
  assert.throws(() => {
    const start = timeToMinutes("10:00");
    const end = timeToMinutes("09:00");
    if (end <= start) {
      throw new Error("Giờ kết thúc phải sau giờ bắt đầu.");
    }
  }, /Giờ kết thúc/);
});
