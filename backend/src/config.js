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
  database: {
    host: process.env.DB_HOST || "localhost",
    port: optionalInt(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || "attendance",
    password: process.env.DB_PASSWORD || "attendance_password",
    name: process.env.DB_NAME || "attendance_db",
  },
};
