import { query } from "./pool.js";
import { logger } from "../logger.js";

const seedStudents = [
  {
    studentCode: "SV001",
    fullName: "Nguyen Van An",
    className: "D21CQCN01",
  },
  {
    studentCode: "SV002",
    fullName: "Tran Thi Binh",
    className: "D21CQCN01",
  },
  {
    studentCode: "SV003",
    fullName: "Le Minh Chau",
    className: "D21CQCN02",
  },
  {
    studentCode: "SV004",
    fullName: "Pham Quoc Duy",
    className: "D21CQCN02",
  },
];

async function ignoreMigrationError(statement) {
  try {
    await query(statement);
  } catch (error) {
    logger.warn("migration statement skipped", {
      message: error.message,
      statement: statement.slice(0, 80),
    });
  }
}

export async function migrate() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(64) UNIQUE NOT NULL,
      full_name VARCHAR(160) NOT NULL,
      role VARCHAR(32) NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
      student_id INT NULL,
      password_hash VARCHAR(128) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await ignoreMigrationError("ALTER TABLE users DROP CHECK users_chk_1");
  await ignoreMigrationError("ALTER TABLE users ADD COLUMN student_id INT NULL");

  await query(`
    CREATE TABLE IF NOT EXISTS students (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_code VARCHAR(32) UNIQUE NOT NULL,
      full_name VARCHAR(160) NOT NULL,
      class_name VARCHAR(80) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS classes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      class_code VARCHAR(80) UNIQUE NOT NULL,
      class_name VARCHAR(160) NOT NULL,
      teacher_id INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_classes_teacher
        FOREIGN KEY (teacher_id) REFERENCES users(id)
        ON DELETE SET NULL
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      attendance_date DATE NOT NULL,
      status VARCHAR(16) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
      marked_by_user_id INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE (student_id, attendance_date),
      CONSTRAINT fk_attendance_student
        FOREIGN KEY (student_id) REFERENCES students(id)
        ON DELETE CASCADE
    )
  `);

  await ignoreMigrationError("ALTER TABLE attendance DROP CHECK attendance_chk_1");
  await ignoreMigrationError("ALTER TABLE attendance ADD COLUMN marked_by_user_id INT NULL");

  await query(`
    CREATE TABLE IF NOT EXISTS attendance_locks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      class_name VARCHAR(80) NOT NULL,
      attendance_date DATE NOT NULL,
      locked_by_user_id INT NOT NULL,
      locked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (class_name, attendance_date),
      CONSTRAINT fk_attendance_locks_user
        FOREIGN KEY (locked_by_user_id) REFERENCES users(id)
        ON DELETE RESTRICT
    )
  `);

  logger.info("database migration completed");
}

export async function seed() {
  const { config } = await import("../config.js");
  const { hashPassword } = await import("../services/authService.js");
  const seedUsers = [
    {
      username: "admin",
      fullName: "System Admin",
      role: "admin",
      password: config.auth.adminPassword,
    },
    {
      username: "teacher",
      fullName: "Attendance Teacher",
      role: "teacher",
      password: config.auth.teacherPassword,
    },
    {
      username: "student",
      fullName: "Student Demo",
      role: "student",
      password: config.auth.studentPassword,
    },
  ];

  for (const user of seedUsers) {
    await query(
      `
        INSERT INTO users (username, full_name, role, password_hash)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          full_name = VALUES(full_name),
          role = VALUES(role),
          password_hash = VALUES(password_hash)
      `,
      [
        user.username,
        user.fullName,
        user.role,
        hashPassword(user.password, user.username),
      ],
    );
  }

  for (const student of seedStudents) {
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
  }

  await query(
    `
      UPDATE users u
      JOIN students s ON s.student_code = 'SV001'
      SET u.student_id = s.id
      WHERE u.username = 'student'
    `,
  );

  await query(`
    INSERT INTO classes (class_code, class_name, teacher_id)
    SELECT DISTINCT
      s.class_name,
      s.class_name,
      (SELECT id FROM users WHERE username = 'teacher' LIMIT 1)
    FROM students s
    ON DUPLICATE KEY UPDATE
      class_name = classes.class_name,
      teacher_id = VALUES(teacher_id)
  `);

  logger.info("database seed completed", {
    users: seedUsers.length,
    students: seedStudents.length,
  });
}
