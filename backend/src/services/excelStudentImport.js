import xlsx from "xlsx";
import { pool } from "../db/pool.js";

const headerAliases = {
  studentCode: [
    "studentcode",
    "student_code",
    "mssv",
    "masv",
    "ma_sv",
    "ma sinh vien",
    "ma sv",
  ],
  fullName: [
    "fullname",
    "full_name",
    "hoten",
    "ho ten",
    "ten sinh vien",
    "name",
  ],
  className: ["classname", "class_name", "lop", "class", "ma lop", "ten lop"],
};

function normalizeHeader(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function readField(row, aliases) {
  for (const [header, value] of Object.entries(row)) {
    const normalized = normalizeHeader(header);
    if (aliases.includes(normalized) || aliases.includes(normalized.replace(/\s/g, ""))) {
      return String(value || "").trim();
    }
  }

  return "";
}

export function normalizeStudentRows(rows, importClassName = "") {
  const studentsByCode = new Map();
  const forcedClassName = String(importClassName || "").trim();

  for (const row of rows) {
    const studentCode = readField(row, headerAliases.studentCode);
    const fullName = readField(row, headerAliases.fullName);
    const className = forcedClassName || readField(row, headerAliases.className);

    if (!studentCode && !fullName && !className) {
      continue;
    }

    if (!studentCode || !fullName || !className) {
      throw Object.assign(
        new Error(
          "Excel rows must include student code, full name, and class name.",
        ),
        { statusCode: 400 },
      );
    }

    studentsByCode.set(studentCode, {
      studentCode,
      fullName,
      className,
    });
  }

  return [...studentsByCode.values()];
}

export function parseStudentWorkbook(buffer, importClassName = "") {
  const workbook = xlsx.read(buffer, { type: "buffer", codepage: 65001 });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw Object.assign(new Error("Excel file has no sheets."), {
      statusCode: 400,
    });
  }

  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
    defval: "",
  });
  const students = normalizeStudentRows(rows, importClassName);

  if (students.length === 0) {
    throw Object.assign(new Error("Excel file has no valid student rows."), {
      statusCode: 400,
    });
  }

  return students;
}

export async function importStudents(students) {
  const connection = await pool.getConnection();
  let inserted = 0;
  let updated = 0;
  const classNames = new Set(students.map((student) => student.className));

  try {
    await connection.beginTransaction();

    for (const student of students) {
      const [result] = await connection.execute(
        `
          INSERT INTO students (student_code, full_name, class_name)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE
            full_name = VALUES(full_name),
            class_name = VALUES(class_name)
        `,
        [
          student.studentCode,
          student.fullName,
          student.className,
        ],
      );

      if (result.affectedRows === 1) {
        inserted += 1;
      } else {
        updated += 1;
      }
    }

    await connection.execute(`
      INSERT INTO classes (class_code, class_name, teacher_id)
      SELECT DISTINCT
        s.class_name,
        s.class_name,
        (SELECT id FROM users WHERE username = 'teacher' LIMIT 1)
      FROM students s
      WHERE s.class_name <> ''
      ON DUPLICATE KEY UPDATE
        class_name = classes.class_name,
        teacher_id = COALESCE(classes.teacher_id, VALUES(teacher_id))
    `);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return {
    imported: students.length,
    inserted,
    updated,
    className: classNames.size === 1 ? [...classNames][0] : null,
  };
}
