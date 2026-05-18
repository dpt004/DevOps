import { pool, query } from "../db/pool.js";
import {
  normalizeDate,
  normalizeStatus,
  validateAttendanceRecords,
} from "./validators.js";

const statusLabels = {
  present: "Có mặt",
  absent: "Vắng",
  late: "Đi trễ",
  excused: "Có phép",
};

function mapStudent(row) {
  return {
    id: row.id,
    studentCode: row.student_code,
    fullName: row.full_name,
    className: row.class_name,
  };
}

function mapClass(row) {
  return {
    id: row.id,
    classCode: row.class_code,
    className: row.class_name,
    teacher: row.teacher_id
      ? {
          id: row.teacher_id,
          username: row.teacher_username,
          fullName: row.teacher_full_name,
        }
      : null,
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
          statusLabel: statusLabels[row.status] || row.status,
          absenceReason: row.absence_reason || "",
          isExcused: row.is_excused ? true : false,
          markedBy: row.marked_by_username
            ? {
                id: row.marked_by_user_id,
                username: row.marked_by_username,
                fullName: row.marked_by_full_name,
              }
            : null,
        }
      : null,
  };
}

function requireClassName(value) {
  const className = String(value || "").trim();
  if (!className) {
    throw Object.assign(new Error("className is required."), {
      statusCode: 400,
    });
  }
  return className;
}

function normalizeClassPayload(payload) {
  const classCode = String(payload.classCode || payload.className || "").trim();
  const className = String(payload.className || payload.classCode || "").trim();

  if (!classCode || !className) {
    throw Object.assign(new Error("classCode and className are required."), {
      statusCode: 400,
    });
  }

  return { classCode, className };
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function syncClasses() {
  await query(`
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
}

export async function listClasses(user) {
  if (user?.role === "student") {
    const rows = await query(
      `
        SELECT DISTINCT s.class_name AS class_code, s.class_name
        FROM students s
        WHERE s.id = ?
        ORDER BY s.class_name ASC
      `,
      [user.studentId || 0],
    );
    return rows.map((row) => ({
      classCode: row.class_code,
      className: row.class_name,
    }));
  }

  await syncClasses();
  const rows = await query(`
    SELECT
      c.id,
      c.class_code,
      c.class_name,
      c.teacher_id,
      u.username AS teacher_username,
      u.full_name AS teacher_full_name
    FROM classes c
    LEFT JOIN users u ON u.id = c.teacher_id
    ORDER BY c.class_code ASC
  `);

  return rows.map(mapClass);
}

export async function createClass(payload) {
  const { classCode, className } = normalizeClassPayload(payload);
  const result = await query(
    `
      INSERT INTO classes (class_code, class_name)
      VALUES (?, ?)
    `,
    [classCode, className],
  );

  return {
    id: result.insertId,
    classCode,
    className,
    teacher: null,
  };
}

export async function updateClass(idValue, payload) {
  const id = Number(idValue);
  const { classCode, className } = normalizeClassPayload(payload);

  if (!Number.isInteger(id) || id <= 0) {
    throw Object.assign(new Error("Class id is invalid."), {
      statusCode: 400,
    });
  }

  const rows = await query(
    `
      SELECT class_code
      FROM classes
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  );
  const current = rows[0];

  if (!current) {
    throw Object.assign(new Error("Class not found."), { statusCode: 404 });
  }

  const client = await pool.getConnection();
  try {
    await client.beginTransaction();
    await client.execute(
      `
        UPDATE classes
        SET class_code = ?, class_name = ?
        WHERE id = ?
      `,
      [classCode, className, id],
    );
    await client.execute(
      `
        UPDATE students
        SET class_name = ?
        WHERE class_name = ?
      `,
      [classCode, current.class_code],
    );
    await client.execute(
      `
        UPDATE attendance_locks
        SET class_name = ?
        WHERE class_name = ?
      `,
      [classCode, current.class_code],
    );
    await client.commit();
  } catch (error) {
    await client.rollback();
    throw error;
  } finally {
    client.release();
  }

  return {
    id,
    classCode,
    className,
    teacher: null,
  };
}

export async function deleteClass(idValue) {
  const id = Number(idValue);

  if (!Number.isInteger(id) || id <= 0) {
    throw Object.assign(new Error("Class id is invalid."), {
      statusCode: 400,
    });
  }

  const rows = await query(
    `
      SELECT c.class_code, COUNT(s.id) AS student_count
      FROM classes c
      LEFT JOIN students s ON s.class_name = c.class_code
      WHERE c.id = ?
      GROUP BY c.id, c.class_code
      LIMIT 1
    `,
    [id],
  );
  const current = rows[0];

  if (!current) {
    throw Object.assign(new Error("Class not found."), { statusCode: 404 });
  }

  if (Number(current.student_count) > 0) {
    throw Object.assign(
      new Error("Cannot delete a class that still has students."),
      { statusCode: 409 },
    );
  }

  await query("DELETE FROM classes WHERE id = ?", [id]);
  return { id };
}

export async function listStudents(filters = {}, user) {
  const params = [];
  const where = [];

  if (filters.className) {
    where.push("class_name = ?");
    params.push(filters.className);
  }

  if (user?.role === "student") {
    where.push("id = ?");
    params.push(user.studentId || 0);
  }

  const sqlWhere = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const result = await query(
    `
      SELECT id, student_code, full_name, class_name
      FROM students
      ${sqlWhere}
      ORDER BY class_name ASC, student_code ASC
    `,
    params,
  );

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

  const studentId = result.insertId;

  // Auto-link matching user accounts
  await query(
    `
      UPDATE users
      SET student_id = ?
      WHERE username = ? AND role = 'student'
    `,
    [studentId, studentCode]
  );

  await syncClasses();

  return {
    id: studentId,
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

  await syncClasses();

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

  await syncClasses();

  return { id };
}

export async function getAttendanceLock(dateValue, classNameValue) {
  const date = normalizeDate(dateValue);
  const className = requireClassName(classNameValue);
  const rows = await query(
    `
      SELECT
        l.id,
        l.class_name,
        DATE_FORMAT(l.attendance_date, '%Y-%m-%d') AS attendance_date,
        l.locked_at,
        u.username,
        u.full_name
      FROM attendance_locks l
      JOIN users u ON u.id = l.locked_by_user_id
      WHERE l.attendance_date = ? AND l.class_name = ?
      LIMIT 1
    `,
    [date, className],
  );

  const lock = rows[0];
  return lock
    ? {
        id: lock.id,
        className: lock.class_name,
        date: lock.attendance_date,
        lockedAt: lock.locked_at,
        lockedBy: {
          username: lock.username,
          fullName: lock.full_name,
        },
      }
    : null;
}

export async function lockAttendance(dateValue, classNameValue, user) {
  const date = normalizeDate(dateValue);
  const className = requireClassName(classNameValue);

  await query(
    `
      INSERT INTO attendance_locks (class_name, attendance_date, locked_by_user_id)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        locked_by_user_id = VALUES(locked_by_user_id),
        locked_at = CURRENT_TIMESTAMP
    `,
    [className, date, user.id],
  );

  return getAttendanceLock(date, className);
}

export async function unlockAttendance(dateValue, classNameValue) {
  const date = normalizeDate(dateValue);
  const className = requireClassName(classNameValue);

  await query(
    `
      DELETE FROM attendance_locks
      WHERE class_name = ? AND attendance_date = ?
    `,
    [className, date],
  );

  return null;
}

export async function getAttendanceByDate(filters = {}, user) {
  const date = normalizeDate(filters.date);
  const params = [date];
  const where = [];

  if (filters.className) {
    where.push("s.class_name = ?");
    params.push(filters.className);
  }

  if (filters.status) {
    where.push("a.status = ?");
    params.push(normalizeStatus(filters.status));
  }

  if (filters.studentCode) {
    where.push("s.student_code LIKE ?");
    params.push(`%${filters.studentCode}%`);
  }

  if (user?.role === "student") {
    where.push("s.id = ?");
    params.push(user.studentId || 0);
  }

  const sqlWhere = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const result = await query(
    `
      SELECT
        s.id,
        s.student_code,
        s.full_name,
        s.class_name,
        a.id AS attendance_id,
        DATE_FORMAT(a.attendance_date, '%Y-%m-%d') AS attendance_date,
        a.status,
        a.absence_reason,
        a.is_excused,
        a.marked_by_user_id,
        u.username AS marked_by_username,
        u.full_name AS marked_by_full_name
      FROM students s
      LEFT JOIN attendance a
        ON a.student_id = s.id
       AND a.attendance_date = ?
      LEFT JOIN users u ON u.id = a.marked_by_user_id
      ${sqlWhere}
      ORDER BY s.class_name ASC, s.student_code ASC
    `,
    params,
  );

  const className = filters.className || result[0]?.class_name;
  return {
    rows: result.map(mapAttendance),
    lock: className ? await getAttendanceLock(date, className) : null,
  };
}

export async function saveAttendance(dateValue, classNameValue, recordsValue, user) {
  const date = normalizeDate(dateValue);
  const className = requireClassName(classNameValue);
  const records = validateAttendanceRecords(recordsValue);
  const existingLock = await getAttendanceLock(date, className);

  if (existingLock) {
    throw Object.assign(new Error("Attendance is locked for this class and date."), {
      statusCode: 423,
    });
  }

  const allowedRows = await query(
    `
      SELECT id
      FROM students
      WHERE class_name = ?
    `,
    [className],
  );
  const allowedIds = new Set(allowedRows.map((row) => row.id));

  for (const record of records) {
    if (!allowedIds.has(record.studentId)) {
      throw Object.assign(
        new Error("All attendance records must belong to the selected class."),
        { statusCode: 400 },
      );
    }
  }

  const client = await pool.getConnection();

  try {
    await client.beginTransaction();
    for (const record of records) {
      await client.execute(
        `
          INSERT INTO attendance (
            student_id,
            attendance_date,
            status,
            marked_by_user_id,
            absence_reason,
            is_excused
          )
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            status = VALUES(status),
            marked_by_user_id = VALUES(marked_by_user_id),
            absence_reason = VALUES(absence_reason),
            is_excused = VALUES(is_excused),
            updated_at = CURRENT_TIMESTAMP
        `,
        [record.studentId, date, record.status, user.id, record.absenceReason, record.isExcused],
      );
    }
    await client.commit();
  } catch (error) {
    await client.rollback();
    throw error;
  } finally {
    client.release();
  }

  return getAttendanceByDate({ date, className }, user);
}

export async function getAttendanceStats(filters = {}, user) {
  const from = normalizeDate(filters.from);
  const to = normalizeDate(filters.to);
  const params = [from, to];
  const where = [];

  if (from > to) {
    throw Object.assign(new Error("from must be before or equal to to."), {
      statusCode: 400,
    });
  }

  if (filters.className) {
    where.push("s.class_name = ?");
    params.push(filters.className);
  }

  if (filters.studentCode) {
    where.push("s.student_code LIKE ?");
    params.push(`%${filters.studentCode}%`);
  }

  if (user?.role === "student") {
    where.push("s.id = ?");
    params.push(user.studentId || 0);
  }

  const sqlWhere = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const result = await query(
    `
      SELECT
        s.id,
        s.student_code,
        s.full_name,
        s.class_name,
        COUNT(a.id) AS total_marked,
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN a.status = 'absent' AND a.is_excused = FALSE THEN 1 ELSE 0 END) AS absent_count,
        SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) AS late_count,
        SUM(CASE WHEN a.status = 'excused' OR (a.status = 'absent' AND a.is_excused = TRUE) THEN 1 ELSE 0 END) AS excused_count
      FROM students s
      LEFT JOIN attendance a
        ON a.student_id = s.id
       AND a.attendance_date BETWEEN ? AND ?
      ${sqlWhere}
      GROUP BY s.id, s.student_code, s.full_name, s.class_name
      ORDER BY s.class_name ASC, s.student_code ASC
    `,
    params,
  );

  return result.map((row) => {
    const totalMarked = Number(row.total_marked);
    const presentCount = Number(row.present_count);

    return {
      student: {
        id: row.id,
        studentCode: row.student_code,
        fullName: row.full_name,
        className: row.class_name,
      },
      totalMarked,
      presentCount,
      absentCount: Number(row.absent_count),
      lateCount: Number(row.late_count),
      excusedCount: Number(row.excused_count),
      attendanceRate:
        totalMarked > 0 ? Number(((presentCount / totalMarked) * 100).toFixed(1)) : 0,
    };
  });
}

export function statsToCsv(rows) {
  const header = [
    "MSSV",
    "Ho ten",
    "Lop",
    "Tong buoi",
    "Co mat",
    "Vang",
    "Di tre",
    "Co phep",
    "Ty le chuyen can",
  ];
  const lines = rows.map((row) =>
    [
      row.student.studentCode,
      row.student.fullName,
      row.student.className,
      row.totalMarked,
      row.presentCount,
      row.absentCount,
      row.lateCount,
      row.excusedCount,
      `${row.attendanceRate}%`,
    ]
      .map(csvCell)
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}

export async function getMarkedDatesForClass(className) {
  const cn = requireClassName(className);
  const rows = await query(
    `
      SELECT DISTINCT DATE_FORMAT(a.attendance_date, '%Y-%m-%d') AS date
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE s.class_name = ?
      ORDER BY date ASC
    `,
    [cn]
  );
  return rows.map(r => r.date);
}

export async function getUnassignedStudentUsers() {
  const rows = await query(
    `
      SELECT id, username, full_name
      FROM users
      WHERE role = 'student' AND student_id IS NULL
      ORDER BY username ASC
    `
  );
  return rows.map(r => ({
    id: r.id,
    studentCode: r.username,
    fullName: r.full_name,
  }));
}
