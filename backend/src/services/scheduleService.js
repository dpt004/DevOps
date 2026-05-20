import { query } from "../db/pool.js";
import { normalizeTime, timeToMinutes } from "./scheduleUtils.js";

export { normalizeTime, rangesOverlap, timeToMinutes } from "./scheduleUtils.js";

const dayLabels = {
  1: "Thứ 2",
  2: "Thứ 3",
  3: "Thứ 4",
  4: "Thứ 5",
  5: "Thứ 6",
  6: "Thứ 7",
  7: "Chủ nhật",
};

function mapSchedule(row) {
  return {
    id: row.id,
    classId: row.class_id,
    classCode: row.class_code,
    className: row.class_name,
    teacherId: row.teacher_id,
    teacher: row.teacher_id
      ? {
          id: row.teacher_id,
          username: row.teacher_username,
          fullName: row.teacher_full_name,
        }
      : null,
    dayOfWeek: row.day_of_week,
    dayLabel: dayLabels[row.day_of_week] || `Ngày ${row.day_of_week}`,
    startTime: String(row.start_time).slice(0, 5),
    endTime: String(row.end_time).slice(0, 5),
    room: row.room || "",
    subjectName: row.subject_name || "",
    studentCount: Number(row.student_count || 0),
  };
}

function normalizeDayOfWeek(value) {
  const day = Number(value);
  if (!Number.isInteger(day) || day < 1 || day > 7) {
    throw Object.assign(
      new Error("Thứ trong tuần phải từ 1 (Thứ 2) đến 7 (Chủ nhật)."),
      { statusCode: 400 },
    );
  }
  return day;
}

function normalizeSchedulePayload(payload) {
  const classId = Number(payload.classId);
  const teacherId = Number(payload.teacherId);
  const dayOfWeek = normalizeDayOfWeek(payload.dayOfWeek);
  const startTime = normalizeTime(payload.startTime);
  const endTime = normalizeTime(payload.endTime);
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (!Number.isInteger(classId) || classId <= 0) {
    throw Object.assign(new Error("classId is required."), { statusCode: 400 });
  }

  if (!Number.isInteger(teacherId) || teacherId <= 0) {
    throw Object.assign(new Error("teacherId is required."), { statusCode: 400 });
  }

  if (endMinutes <= startMinutes) {
    throw Object.assign(
      new Error("Giờ kết thúc phải sau giờ bắt đầu."),
      { statusCode: 400 },
    );
  }

  const room = String(payload.room || "").trim();
  const subjectName = String(payload.subjectName || "").trim();

  return {
    classId,
    teacherId,
    dayOfWeek,
    startTime,
    endTime,
    room,
    subjectName,
  };
}

async function findOverlappingSlot({
  teacherId,
  classId,
  dayOfWeek,
  startTime,
  endTime,
  excludeId = null,
}) {
  const params = [dayOfWeek, endTime, startTime];
  let excludeClause = "";

  if (excludeId) {
    excludeClause = "AND cs.id <> ?";
    params.push(excludeId);
  }

  const teacherRows = await query(
    `
      SELECT
        cs.id,
        cs.start_time,
        cs.end_time,
        c.class_code,
        c.class_name,
        u.full_name AS teacher_full_name
      FROM class_schedules cs
      JOIN classes c ON c.id = cs.class_id
      JOIN users u ON u.id = cs.teacher_id
      WHERE cs.teacher_id = ?
        AND cs.day_of_week = ?
        AND cs.start_time < ?
        AND cs.end_time > ?
        ${excludeClause}
      LIMIT 1
    `,
    [teacherId, ...params],
  );

  if (teacherRows[0]) {
    const row = teacherRows[0];
    return {
      type: "teacher",
      classCode: row.class_code,
      className: row.class_name,
      startTime: String(row.start_time).slice(0, 5),
      endTime: String(row.end_time).slice(0, 5),
    };
  }

  const classParams = [classId, dayOfWeek, endTime, startTime];
  let classExcludeClause = "";
  if (excludeId) {
    classExcludeClause = "AND cs.id <> ?";
    classParams.push(excludeId);
  }

  const classRows = await query(
    `
      SELECT
        cs.id,
        cs.start_time,
        cs.end_time,
        c.class_code,
        c.class_name,
        u.full_name AS teacher_full_name
      FROM class_schedules cs
      JOIN classes c ON c.id = cs.class_id
      JOIN users u ON u.id = cs.teacher_id
      WHERE cs.class_id = ?
        AND cs.day_of_week = ?
        AND cs.start_time < ?
        AND cs.end_time > ?
        ${classExcludeClause}
      LIMIT 1
    `,
    classParams,
  );

  if (classRows[0]) {
    const row = classRows[0];
    return {
      type: "class",
      classCode: row.class_code,
      className: row.class_name,
      teacherFullName: row.teacher_full_name,
      startTime: String(row.start_time).slice(0, 5),
      endTime: String(row.end_time).slice(0, 5),
    };
  }

  return null;
}

export async function assertNoScheduleOverlap(payload, excludeId = null) {
  const overlap = await findOverlappingSlot({ ...payload, excludeId });
  if (!overlap) {
    return;
  }

  const dayLabel = dayLabels[payload.dayOfWeek] || "";

  if (overlap.type === "teacher") {
    throw Object.assign(
      new Error(
        `Giáo viên đã có tiết dạy lớp ${overlap.classCode} vào ${dayLabel} (${overlap.startTime}–${overlap.endTime}), trùng khung giờ.`,
      ),
      { statusCode: 409 },
    );
  }

  throw Object.assign(
    new Error(
      `Lớp ${overlap.classCode} đã có tiết học vào ${dayLabel} (${overlap.startTime}–${overlap.endTime}) với GV ${overlap.teacherFullName}, trùng khung giờ.`,
    ),
    { statusCode: 409 },
  );
}

const scheduleSelect = `
  SELECT
    cs.id,
    cs.class_id,
    cs.teacher_id,
    cs.day_of_week,
    cs.start_time,
    cs.end_time,
    cs.room,
    cs.subject_name,
    c.class_code,
    c.class_name,
    u.username AS teacher_username,
    u.full_name AS teacher_full_name,
    (
      SELECT COUNT(*)
      FROM students s
      WHERE s.class_name = c.class_code
    ) AS student_count
  FROM class_schedules cs
  JOIN classes c ON c.id = cs.class_id
  JOIN users u ON u.id = cs.teacher_id
`;

export async function listTeachers() {
  const rows = await query(`
    SELECT id, username, full_name, role
    FROM users
    WHERE role IN ('teacher', 'admin')
    ORDER BY full_name ASC, username ASC
  `);

  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    role: row.role,
  }));
}

export async function listSchedules(filters = {}, user) {
  const clauses = [];
  const params = [];

  if (user?.role === "student") {
    clauses.push(`
      c.class_code = (
        SELECT s.class_name
        FROM students s
        WHERE s.id = ?
        LIMIT 1
      )
    `);
    params.push(user.studentId || 0);
  } else if (user?.role === "teacher") {
    clauses.push("cs.teacher_id = ?");
    params.push(user.id);
  } else if (filters.teacherId) {
    clauses.push("cs.teacher_id = ?");
    params.push(Number(filters.teacherId));
  }

  if (filters.classId) {
    clauses.push("cs.class_id = ?");
    params.push(Number(filters.classId));
  }

  if (filters.dayOfWeek) {
    clauses.push("cs.day_of_week = ?");
    params.push(normalizeDayOfWeek(filters.dayOfWeek));
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await query(
    `
      ${scheduleSelect}
      ${where}
      ORDER BY cs.day_of_week ASC, cs.start_time ASC, c.class_code ASC
    `,
    params,
  );

  return rows.map(mapSchedule);
}

export async function getTeacherTimetable(user, filters = {}) {
  if (user?.role === "teacher" || user?.role === "student") {
    return listSchedules(filters, user);
  }

  if (filters.teacherId) {
    return listSchedules(filters, user);
  }

  return listSchedules(filters, user);
}

export async function createSchedule(payload) {
  const data = normalizeSchedulePayload(payload);

  const classRows = await query(
    `SELECT id FROM classes WHERE id = ? LIMIT 1`,
    [data.classId],
  );
  if (!classRows[0]) {
    throw Object.assign(new Error("Class not found."), { statusCode: 404 });
  }

  const teacherRows = await query(
    `
      SELECT id FROM users
      WHERE id = ? AND role IN ('teacher', 'admin')
      LIMIT 1
    `,
    [data.teacherId],
  );
  if (!teacherRows[0]) {
    throw Object.assign(new Error("Teacher not found."), { statusCode: 404 });
  }

  await assertNoScheduleOverlap(data);

  const result = await query(
    `
      INSERT INTO class_schedules (
        class_id,
        teacher_id,
        day_of_week,
        start_time,
        end_time,
        room,
        subject_name
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.classId,
      data.teacherId,
      data.dayOfWeek,
      data.startTime,
      data.endTime,
      data.room || null,
      data.subjectName || null,
    ],
  );

  const rows = await query(
    `${scheduleSelect} WHERE cs.id = ? LIMIT 1`,
    [result.insertId],
  );
  return mapSchedule(rows[0]);
}

export async function updateSchedule(idValue, payload) {
  const id = Number(idValue);
  if (!Number.isInteger(id) || id <= 0) {
    throw Object.assign(new Error("Schedule id is invalid."), {
      statusCode: 400,
    });
  }

  const existing = await query(
    `SELECT id FROM class_schedules WHERE id = ? LIMIT 1`,
    [id],
  );
  if (!existing[0]) {
    throw Object.assign(new Error("Schedule not found."), { statusCode: 404 });
  }

  const data = normalizeSchedulePayload(payload);
  await assertNoScheduleOverlap(data, id);

  await query(
    `
      UPDATE class_schedules
      SET
        class_id = ?,
        teacher_id = ?,
        day_of_week = ?,
        start_time = ?,
        end_time = ?,
        room = ?,
        subject_name = ?
      WHERE id = ?
    `,
    [
      data.classId,
      data.teacherId,
      data.dayOfWeek,
      data.startTime,
      data.endTime,
      data.room || null,
      data.subjectName || null,
      id,
    ],
  );

  const rows = await query(
    `${scheduleSelect} WHERE cs.id = ? LIMIT 1`,
    [id],
  );
  return mapSchedule(rows[0]);
}

export async function deleteSchedule(idValue) {
  const id = Number(idValue);
  if (!Number.isInteger(id) || id <= 0) {
    throw Object.assign(new Error("Schedule id is invalid."), {
      statusCode: 400,
    });
  }

  const result = await query(`DELETE FROM class_schedules WHERE id = ?`, [id]);
  if (result.affectedRows === 0) {
    throw Object.assign(new Error("Schedule not found."), { statusCode: 404 });
  }

  return { success: true };
}
