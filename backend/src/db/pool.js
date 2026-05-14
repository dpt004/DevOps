import mysql from "mysql2/promise";
import { config } from "../config.js";

export const pool = mysql.createPool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function query(text, params = []) {
  const [rows] = await pool.execute(text, params);
  return rows;
}

export async function checkDatabase() {
  const rows = await query("SELECT 1 AS ok");
  return rows[0]?.ok === 1;
}

export async function closePool() {
  await pool.end();
}
