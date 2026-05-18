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

export async function register(usernameValue, fullNameValue, passwordValue, roleValue = "teacher") {
  const username = String(usernameValue || "").trim();
  const fullName = String(fullNameValue || "").trim();
  const password = String(passwordValue || "");
  const role = String(roleValue || "teacher").trim();

  if (!username || !fullName || !password) {
    throw Object.assign(new Error("Vui lòng nhập đầy đủ họ tên, tên đăng nhập và mật khẩu."), {
      statusCode: 400,
    });
  }

  if (password.length < 6) {
    throw Object.assign(new Error("Mật khẩu phải chứa ít nhất 6 ký tự."), {
      statusCode: 400,
    });
  }

  if (!["teacher", "student"].includes(role)) {
    throw Object.assign(new Error("Quyền đăng ký tài khoản không hợp lệ."), {
      statusCode: 400,
    });
  }

  // Check if user already exists
  const existing = await query(
    `
      SELECT id FROM users
      WHERE username = ?
      LIMIT 1
    `,
    [username],
  );

  if (existing.length > 0) {
    throw Object.assign(new Error("Tên đăng nhập này đã tồn tại trên hệ thống."), {
      statusCode: 409,
    });
  }

  const passwordHash = hashPassword(password, username);

  const result = await query(
    `
      INSERT INTO users (username, full_name, role, password_hash)
      VALUES (?, ?, ?, ?)
    `,
    [username, fullName, role, passwordHash],
  );

  const rows = await query(
    `
      SELECT id, username, full_name, role, student_id
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [result.insertId],
  );

  const safeUser = publicUser(rows[0]);
  return {
    user: safeUser,
    token: createToken(safeUser),
  };
}
