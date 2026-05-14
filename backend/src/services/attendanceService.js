import { pool, query } from "../db/pool.js";
import { normalizeDate, validateAttendanceRecords } from "./validators.js";

function mapStudent(row) {
  return {
    id: row.id,
    studentCode: row.student_code,
    fullName: row.full_name,
    className: row.class_name,
  };
}

function mapAttendance(row) {
  return {
    student: mapStudent(row),
    attendance: row.attendance_id
      ? {
          id: row.attendance_id,
          date: row.attendance_date,
          status: row.status,
        }
      : null,
  };
}

export async function listStudents() {
  const result = await query(`
    SELECT id, student_code, full_name, class_name
    FROM students
    ORDER BY student_code ASC
  `);

  return result.map(mapStudent);
}

export async function createStudent(payload) {
  const studentCode = String(payload.studentCode || "").trim();
  const fullName = String(payload.fullName || "").trim();
  const className = String(payload.className || "").trim();

  if (!studentCode || !fullName || !className) {
    throw Object.assign(
      new Error("studentCode, fullName, and className are required."),
      { statusCode: 400 },
    );
  }

  const result = await query(
    `
      INSERT INTO students (student_code, full_name, class_name)
      VALUES (?, ?, ?)
    `,
    [studentCode, fullName, className],
  );

  return {
    id: result.insertId,
    studentCode,
    fullName,
    className,
  };
}

export async function updateStudent(idValue, payload) {
  const id = Number(idValue);
  const studentCode = String(payload.studentCode || "").trim();
  const fullName = String(payload.fullName || "").trim();
  const className = String(payload.className || "").trim();

  if (!Number.isInteger(id) || id <= 0) {
    throw Object.assign(new Error("Student id is invalid."), {
      statusCode: 400,
    });
  }

  if (!studentCode || !fullName || !className) {
    throw Object.assign(
      new Error("studentCode, fullName, and className are required."),
      { statusCode: 400 },
    );
  }

  const result = await query(
    `
      UPDATE students
      SET student_code = ?, full_name = ?, class_name = ?
      WHERE id = ?
    `,
    [studentCode, fullName, className, id],
  );

  if (result.affectedRows === 0) {
    throw Object.assign(new Error("Student not found."), { statusCode: 404 });
  }

  return {
    id,
    studentCode,
    fullName,
    className,
  };
}

export async function deleteStudent(idValue) {
  const id = Number(idValue);

  if (!Number.isInteger(id) || id <= 0) {
    throw Object.assign(new Error("Student id is invalid."), {
      statusCode: 400,
    });
  }

  const result = await query("DELETE FROM students WHERE id = ?", [id]);
  if (result.affectedRows === 0) {
    throw Object.assign(new Error("Student not found."), { statusCode: 404 });
  }

  return { id };
}

export async function getAttendanceByDate(dateValue) {
  const date = normalizeDate(dateValue);
  const result = await query(
    `
      SELECT
        s.id,
        s.student_code,
        s.full_name,
        s.class_name,
        a.id AS attendance_id,
        DATE_FORMAT(a.attendance_date, '%Y-%m-%d') AS attendance_date,
        a.status
      FROM students s
      LEFT JOIN attendance a
        ON a.student_id = s.id
       AND a.attendance_date = ?
      ORDER BY s.student_code ASC
    `,
    [date],
  );

  return result.map(mapAttendance);
}

export async function saveAttendance(dateValue, recordsValue) {
  const date = normalizeDate(dateValue);
  const records = validateAttendanceRecords(recordsValue);
  const client = await pool.getConnection();

  try {
    await client.beginTransaction();
    for (const record of records) {
      await client.execute(
        `
          INSERT INTO attendance (student_id, attendance_date, status)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE
            status = VALUES(status),
            updated_at = CURRENT_TIMESTAMP
        `,
        [record.studentId, date, record.status],
      );
    }
    await client.commit();
  } catch (error) {
    await client.rollback();
    throw error;
  } finally {
    client.release();
  }

  return getAttendanceByDate(date);
}

export async function getAttendanceStats(fromValue, toValue) {
  const from = normalizeDate(fromValue);
  const to = normalizeDate(toValue);

  if (from > to) {
    throw Object.assign(new Error("from must be before or equal to to."), {
      statusCode: 400,
    });
  }

  const result = await query(
    `
      SELECT
        s.id,
        s.student_code,
        s.full_name,
        s.class_name,
        COUNT(a.id) AS total_marked,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent_count
      FROM students s
      LEFT JOIN attendance a
        ON a.student_id = s.id
       AND a.attendance_date BETWEEN ? AND ?
      GROUP BY s.id, s.student_code, s.full_name, s.class_name
      ORDER BY present_count DESC, s.student_code ASC
    `,
    [from, to],
  );

  return result.map((row) => ({
    student: {
      id: row.id,
      studentCode: row.student_code,
      fullName: row.full_name,
      className: row.class_name,
    },
    totalMarked: Number(row.total_marked),
    presentCount: Number(row.present_count),
    absentCount: Number(row.absent_count),
  }));
}
