import assert from "node:assert/strict";
import test from "node:test";
import { normalizeStudentRows } from "../src/services/excelStudentImport.js";

test("normalizeStudentRows accepts Vietnamese Excel headers", () => {
  const rows = [
    {
      "Mã sinh viên": "SV101",
      "Họ tên": "Nguyen Thi Hoa",
      "Lớp": "D21CQCN03",
    },
  ];

  assert.deepEqual(normalizeStudentRows(rows), [
    {
      studentCode: "SV101",
      fullName: "Nguyen Thi Hoa",
      className: "D21CQCN03",
    },
  ]);
});

test("normalizeStudentRows de-duplicates by student code", () => {
  const rows = [
    { MSSV: "SV101", "Ho ten": "Old Name", Lop: "A" },
    { MSSV: "SV101", "Ho ten": "New Name", Lop: "B" },
  ];

  assert.deepEqual(normalizeStudentRows(rows), [
    {
      studentCode: "SV101",
      fullName: "New Name",
      className: "B",
    },
  ]);
});

test("normalizeStudentRows can force one class for the whole import file", () => {
  const rows = [
    { MSSV: "SV201", "Ho ten": "Le Quoc Anh", Lop: "OLD" },
    { MSSV: "SV202", "Ho ten": "Nguyen Thanh Binh", Lop: "OLD" },
  ];

  assert.deepEqual(normalizeStudentRows(rows, "D21CQCN02"), [
    {
      studentCode: "SV201",
      fullName: "Le Quoc Anh",
      className: "D21CQCN02",
    },
    {
      studentCode: "SV202",
      fullName: "Nguyen Thanh Binh",
      className: "D21CQCN02",
    },
  ]);
});
