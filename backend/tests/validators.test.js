import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeDate,
  normalizeStatus,
  validateAttendanceRecords,
} from "../src/services/validators.js";

test("normalizeDate accepts ISO calendar dates", () => {
  assert.equal(normalizeDate("2026-05-14"), "2026-05-14");
});

test("normalizeDate rejects invalid dates", () => {
  assert.throws(() => normalizeDate("2026-02-31"), /invalid/);
  assert.throws(() => normalizeDate("14-05-2026"), /YYYY-MM-DD/);
});

test("normalizeStatus only accepts supported attendance states", () => {
  assert.equal(normalizeStatus("present"), "present");
  assert.equal(normalizeStatus("absent"), "absent");
  assert.throws(() => normalizeStatus("unknown"), /Status must be one of/);
});

test("validateAttendanceRecords normalizes valid records", () => {
  assert.deepEqual(
    validateAttendanceRecords([
      { studentId: "1", status: "present" },
    ]),
    [{ studentId: 1, status: "present" }],
  );
});
