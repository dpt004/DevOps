import crypto from "node:crypto";
import { config } from "../config.js";
import { query } from "../db/pool.js";

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(value) {
  return crypto
    .createHmac("sha256", config.auth.tokenSecret)
    .update(value)
    .digest("base64url");
}

export function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 32).toString("hex");
}

function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    role: row.role,
    studentId: row.student_id,
  };
}

export function createToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    studentId: user.studentId,
    exp: Math.floor(Date.now() / 1000) + config.auth.tokenTtlSeconds,
  };
  const encoded = base64url(payload);
  return `${encoded}.${sign(encoded)}`;
}

export function verifyToken(token) {
  if (typeof token !== "string" || !token.includes(".")) {
    throw Object.assign(new Error("Invalid token."), { statusCode: 401 });
  }

  const [encoded, signature] = token.split(".");
  if (signature !== sign(encoded)) {
    throw Object.assign(new Error("Invalid token signature."), {
      statusCode: 401,
    });
  }

  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw Object.assign(new Error("Token has expired."), { statusCode: 401 });
  }

  return payload;
}

export async function login(usernameValue, passwordValue) {
  const username = String(usernameValue || "").trim();
  const password = String(passwordValue || "");

  if (!username || !password) {
    throw Object.assign(new Error("Username and password are required."), {
      statusCode: 400,
    });
  }

  const rows = await query(
    `
      SELECT id, username, full_name, role, student_id, password_hash
      FROM users
      WHERE username = ?
      LIMIT 1
    `,
    [username],
  );

  const user = rows[0];
  if (!user || user.password_hash !== hashPassword(password, username)) {
    throw Object.assign(new Error("Invalid username or password."), {
      statusCode: 401,
    });
  }

  const safeUser = publicUser(user);
  return {
    user: safeUser,
    token: createToken(safeUser),
  };
}
