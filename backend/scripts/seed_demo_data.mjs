import { closePool, query } from "../src/db/pool.js";
import { migrate, seed } from "../src/db/schema.js";
import { config } from "../src/config.js";
import { logger } from "../src/logger.js";
import { hashPassword } from "../src/services/authService.js";

const demoTeachers = [
  {
    username: "teacher_demo_1",
    fullName: "Demo Teacher One",
  },
  {
    username: "teacher_demo_2",
    fullName: "Demo Teacher Two",
  },
];

const demoClasses = [
  {
    classCode: "D21CQCN01",
    className: "D21CQCN01 - Cong nghe phan mem",
    teacherUsername: "teacher",
    schedules: [
      { dayOfWeek: 1, startTime: "07:00", endTime: "09:00", room: "A101", subjectName: "Lap trinh Web" },
      { dayOfWeek: 3, startTime: "13:00", endTime: "15:00", room: "B203", subjectName: "Co so du lieu" },
    ],
  },
  {
    classCode: "D21CQCN02",
    className: "D21CQCN02 - He thong thong tin",
    teacherUsername: "teacher",
    schedules: [
      { dayOfWeek: 2, startTime: "09:00", endTime: "11:00", room: "C305", subjectName: "Mang may tinh" },
      { dayOfWeek: 5, startTime: "15:00", endTime: "17:00", room: "A102", subjectName: "DevOps" },
    ],
  },
  {
    classCode: "D22CQCN01",
    className: "D22CQCN01 - Khoa hoc du lieu",
    teacherUsername: "teacher_demo_1",
    schedules: [
      { dayOfWeek: 1, startTime: "09:00", endTime: "11:00", room: "D401", subjectName: "Phan tich du lieu" },
      { dayOfWeek: 4, startTime: "13:00", endTime: "15:00", room: "D402", subjectName: "Nhap mon AI" },
    ],
  },
  {
    classCode: "D22CQCN02",
    className: "D22CQCN02 - An toan thong tin",
    teacherUsername: "teacher_demo_1",
    schedules: [
      { dayOfWeek: 2, startTime: "13:00", endTime: "15:00", room: "E201", subjectName: "Bao mat Web" },
      { dayOfWeek: 6, startTime: "07:00", endTime: "09:00", room: "E202", subjectName: "Quan tri Linux" },
    ],
  },
  {
    classCode: "D23CQCN01",
    className: "D23CQCN01 - Ky thuat phan mem",
    teacherUsername: "teacher_demo_2",
    schedules: [
      { dayOfWeek: 3, startTime: "07:00", endTime: "09:00", room: "F101", subjectName: "Nhap mon lap trinh" },
      { dayOfWeek: 5, startTime: "09:00", endTime: "11:00", room: "F102", subjectName: "Kiem thu phan mem" },
    ],
  },
];

const lastNames = ["Nguyen", "Tran", "Le", "Pham", "Hoang", "Phan", "Vu", "Vo", "Dang", "Bui", "Do", "Ngo"];
const middleNames = ["Van", "Thi", "Minh", "Quoc", "Duc", "Gia", "Thanh", "Hoai"];
const givenNames = ["An", "Binh", "Chau", "Dung", "Giang", "Hanh", "Khanh", "Linh", "Minh", "Nam", "Phuc", "Quyen"];

function passwordHash(password, username) {
  return hashPassword(password, username);
}

async function upsertUser(username, fullName, role, password) {
  await query(
    `
      INSERT INTO users (username, full_name, role, password_hash)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        full_name = VALUES(full_name),
        role = VALUES(role),
        password_hash = VALUES(password_hash)
    `,
    [username, fullName, role, passwordHash(password, username)],
  );
}

async function getUserId(username) {
  const rows = await query(
    `
      SELECT id
      FROM users
      WHERE username = ?
      LIMIT 1
    `,
    [username],
  );
  return rows[0]?.id;
}

async function upsertClass(classConfig) {
  const teacherId = await getUserId(classConfig.teacherUsername);
  await query(
    `
      INSERT INTO classes (class_code, class_name, teacher_id)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        class_name = VALUES(class_name),
        teacher_id = VALUES(teacher_id)
    `,
    [classConfig.classCode, classConfig.className, teacherId],
  );
}

function demoStudent(classCode, index, globalIndex) {
  const studentCode = `${classCode}-${String(index).padStart(3, "0")}`;
  const fullName = [
    lastNames[globalIndex % lastNames.length],
    middleNames[(globalIndex + index) % middleNames.length],
    givenNames[(globalIndex + index * 2) % givenNames.length],
  ].join(" ");

  return {
    studentCode,
    fullName,
    className: classCode,
    username: studentCode.toLowerCase(),
  };
}

async function upsertStudent(student) {
  await query(
    `
      INSERT INTO students (student_code, full_name, class_name)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        full_name = VALUES(full_name),
        class_name = VALUES(class_name)
    `,
    [student.studentCode, student.fullName, student.className],
  );

  await upsertUser(
    student.username,
    student.fullName,
    "student",
    config.auth.studentPassword,
  );

  await query(
    `
      UPDATE users u
      JOIN students s ON s.student_code = ?
      SET u.student_id = s.id
      WHERE u.username = ?
    `,
    [student.studentCode, student.username],
  );
}

async function upsertSchedule(classConfig, schedule) {
  await query(
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
      SELECT
        c.id,
        u.id,
        ?,
        ?,
        ?,
        ?,
        ?
      FROM classes c
      JOIN users u ON u.username = ?
      WHERE c.class_code = ?
        AND NOT EXISTS (
          SELECT 1
          FROM class_schedules cs
          WHERE cs.class_id = c.id
            AND cs.day_of_week = ?
            AND cs.start_time = ?
        )
      LIMIT 1
    `,
    [
      schedule.dayOfWeek,
      schedule.startTime,
      schedule.endTime,
      schedule.room,
      schedule.subjectName,
      classConfig.teacherUsername,
      classConfig.classCode,
      schedule.dayOfWeek,
      schedule.startTime,
    ],
  );
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function mondayBasedDay(date) {
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

function previousSessionDates(daysOfWeek, count) {
  const wantedDays = new Set(daysOfWeek);
  const today = new Date();
  const cursor = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate() - 1,
  ));
  const dates = [];

  while (dates.length < count) {
    if (wantedDays.has(mondayBasedDay(cursor))) {
      dates.push(isoDate(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return dates.reverse();
}

function attendanceStatus(studentId, sessionIndex) {
  const value = (studentId + sessionIndex * 3) % 12;
  if (value <= 6) {
    return { status: "present", absenceReason: null, isExcused: false };
  }
  if (value <= 8) {
    return { status: "late", absenceReason: "Den muon", isExcused: false };
  }
  if (value <= 10) {
    return { status: "absent", absenceReason: "Vang khong phep", isExcused: false };
  }
  return { status: "excused", absenceReason: "Vang co phep", isExcused: true };
}

async function seedAttendance(classConfig) {
  const rows = await query(
    `
      SELECT id
      FROM students
      WHERE class_name = ?
      ORDER BY student_code ASC
    `,
    [classConfig.classCode],
  );
  const teacherId = await getUserId(classConfig.teacherUsername);
  const daysOfWeek = classConfig.schedules.map((schedule) => schedule.dayOfWeek);
  const dates = previousSessionDates(daysOfWeek, 8);
  let attendanceCount = 0;

  for (const [sessionIndex, date] of dates.entries()) {
    for (const student of rows) {
      const record = attendanceStatus(student.id, sessionIndex);
      await query(
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
        [
          student.id,
          date,
          record.status,
          teacherId,
          record.absenceReason,
          record.isExcused,
        ],
      );
      attendanceCount += 1;
    }

    await query(
      `
        INSERT INTO attendance_locks (class_name, attendance_date, locked_by_user_id)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          locked_by_user_id = VALUES(locked_by_user_id),
          locked_at = CURRENT_TIMESTAMP
      `,
      [classConfig.classCode, date, teacherId],
    );
  }

  return { sessions: dates.length, attendanceCount };
}

async function main() {
  await migrate();
  await seed();

  for (const teacher of demoTeachers) {
    await upsertUser(
      teacher.username,
      teacher.fullName,
      "teacher",
      config.auth.teacherPassword,
    );
  }

  let studentCount = 0;
  let attendanceCount = 0;
  let sessionCount = 0;

  for (const classConfig of demoClasses) {
    await upsertClass(classConfig);

    for (let index = 1; index <= 12; index += 1) {
      const student = demoStudent(
        classConfig.classCode,
        index,
        studentCount + index,
      );
      await upsertStudent(student);
      studentCount += 1;
    }

    for (const schedule of classConfig.schedules) {
      await upsertSchedule(classConfig, schedule);
    }

    const attendance = await seedAttendance(classConfig);
    attendanceCount += attendance.attendanceCount;
    sessionCount += attendance.sessions;
  }

  logger.info("demo data seed completed", {
    classes: demoClasses.length,
    teachers: demoTeachers.length,
    students: studentCount,
    sessions: sessionCount,
    attendanceRecords: attendanceCount,
  });
}

main()
  .catch((error) => {
    logger.error("demo data seed failed", {
      message: error.message,
      stack: error.stack,
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
