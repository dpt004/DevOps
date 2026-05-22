import mysql from "mysql2/promise";
import { config } from "../config.js";

let poolInstance;

function sslOptions() {
  if (!config.database.ssl) {
    return undefined;
  }

  if (config.database.sslCaBase64) {
    return {
      ca: Buffer.from(config.database.sslCaBase64, "base64").toString("utf8"),
      rejectUnauthorized: true,
    };
  }

  return {
    rejectUnauthorized: false,
  };
}

export function getPool() {
  if (!poolInstance) {
    poolInstance = mysql.createPool({
      host: config.database.host,
      port: config.database.port,
      user: config.database.user,
      password: config.database.password,
      database: config.database.name,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 30000,
      maxIdle: 5,
      idleTimeout: 60000,
      ssl: sslOptions(),
    });
  }

  return poolInstance;
}

export const pool = new Proxy(
  {},
  {
    get(_target, property) {
      const value = getPool()[property];
      return typeof value === "function" ? value.bind(getPool()) : value;
    },
  },
);

export async function query(text, params = []) {
  const [rows] = await getPool().execute(text, params);
  return rows;
}

export async function checkDatabase() {
  const rows = await query("SELECT 1 AS ok");
  return rows[0]?.ok === 1;
}

export async function closePool() {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = undefined;
  }
}
