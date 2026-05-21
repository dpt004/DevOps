import { query } from "../src/db/pool.js";
import { hashPassword } from "../src/services/authService.js";
import { logger } from "../src/logger.js";

async function addMockData() {
  logger.info("Starting mock data generation...");

  // Generate 5 teachers
  for (let i = 1; i <= 5; i++) {
    const username = `teacher_mock_${i}`;
    const fullName = `Giảng viên ${i}`;
    const password = "password123";
    const passwordHash = hashPassword(password, username);
    
    await query(
      `
        INSERT INTO users (username, full_name, role, password_hash)
        VALUES (?, ?, 'teacher', ?)
        ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)
      `,
      [username, fullName, passwordHash]
    );
  }
  logger.info("Inserted 5 mock teachers.");

  // Get existing classes
  let classes = await query(`SELECT class_name FROM classes`);
  if (classes.length === 0) {
    classes = [
      { class_name: "D21CQCN01" },
      { class_name: "D21CQCN02" },
      { class_name: "D21CQCN03" },
      { class_name: "D21CQCN04" }
    ];
  }

  // Generate 100 students
  for (let i = 1; i <= 100; i++) {
    const studentCode = `SV_MOCK_${i.toString().padStart(3, '0')}`;
    const fullName = `Sinh viên ${i}`;
    // Randomly pick a class
    const randomClass = classes[Math.floor(Math.random() * classes.length)].class_name;

    await query(
      `
        INSERT INTO students (student_code, full_name, class_name)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          full_name = VALUES(full_name),
          class_name = VALUES(class_name)
      `,
      [studentCode, fullName, randomClass]
    );

    // Create a user account for the student
    const username = studentCode.toLowerCase();
    const passwordHash = hashPassword("password123", username);

    await query(
      `
        INSERT INTO users (username, full_name, role, password_hash)
        VALUES (?, ?, 'student', ?)
        ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)
      `,
      [username, fullName, passwordHash]
    );

    // Link student_id in users table
    await query(
      `
        UPDATE users u
        JOIN students s ON s.student_code = ?
        SET u.student_id = s.id
        WHERE u.username = ?
      `,
      [studentCode, username]
    );
  }
  
  // Make sure classes exist in classes table
  await query(`
    INSERT INTO classes (class_code, class_name, teacher_id)
    SELECT DISTINCT
      s.class_name,
      s.class_name,
      (SELECT id FROM users WHERE role = 'teacher' LIMIT 1)
    FROM students s
    ON DUPLICATE KEY UPDATE
      class_name = classes.class_name
  `);

  logger.info("Inserted 100 mock students and assigned them randomly to classes.");
  
  process.exit(0);
}

addMockData().catch(err => {
  console.error(err);
  process.exit(1);
});
