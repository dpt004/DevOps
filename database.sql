-- Script tạo cơ sở dữ liệu cho ứng dụng điểm danh (Attendance App)
-- Lưu ý: Bạn cần tạo database (ví dụ: CREATE DATABASE attendance_db;) 
-- và USE attendance_db; trước khi chạy script này.

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  role VARCHAR(32) NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  student_id INT NULL,
  password_hash VARCHAR(128) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_code VARCHAR(32) UNIQUE NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  class_name VARCHAR(80) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_code VARCHAR(80) UNIQUE NOT NULL,
  class_name VARCHAR(160) NOT NULL,
  teacher_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_classes_teacher
    FOREIGN KEY (teacher_id) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  attendance_date DATE NOT NULL,
  status VARCHAR(16) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_by_user_id INT NULL,
  absence_reason VARCHAR(255) NULL,
  is_excused BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (student_id, attendance_date),
  CONSTRAINT fk_attendance_student
    FOREIGN KEY (student_id) REFERENCES students(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS class_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  teacher_id INT NOT NULL,
  day_of_week TINYINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(80) NULL,
  subject_name VARCHAR(160) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_schedules_class
    FOREIGN KEY (class_id) REFERENCES classes(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_schedules_teacher
    FOREIGN KEY (teacher_id) REFERENCES users(id)
    ON DELETE RESTRICT
);

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
);
