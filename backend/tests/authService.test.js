import assert from "node:assert/strict";
import test from "node:test";
import {
  createToken,
  hashPassword,
  verifyToken,
} from "../src/services/authService.js";

test("hashPassword is deterministic for the same username salt", () => {
  assert.equal(hashPassword("Admin@123", "admin"), hashPassword("Admin@123", "admin"));
});

test("createToken and verifyToken preserve role payload", () => {
  const token = createToken({
    id: 1,
    username: "admin",
    role: "admin",
  });

  const payload = verifyToken(token);
  assert.equal(payload.username, "admin");
  assert.equal(payload.role, "admin");
});
