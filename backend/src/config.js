import dotenv from "dotenv";

dotenv.config();

function optionalInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: optionalInt(process.env.PORT, 4000),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:8080",
  auth: {
    tokenSecret:
      process.env.AUTH_TOKEN_SECRET || "dev_only_change_this_secret",
    tokenTtlSeconds: optionalInt(process.env.AUTH_TOKEN_TTL_SECONDS, 28800),
    adminPassword: process.env.SEED_ADMIN_PASSWORD || "Admin@123",
    teacherPassword: process.env.SEED_TEACHER_PASSWORD || "Teacher@123",
    studentPassword: process.env.SEED_STUDENT_PASSWORD || "Student@123",
  },
  database: {
    host: process.env.DB_HOST || "localhost",
    port: optionalInt(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || "attendance",
    password: process.env.DB_PASSWORD || "attendance_password",
    name: process.env.DB_NAME || "attendance_db",
  },
};
