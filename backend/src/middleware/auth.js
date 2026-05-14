import { verifyToken } from "../services/authService.js";

export function requireAuth(req, _res, next) {
  try {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    req.user = verifyToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      next(Object.assign(new Error("Authentication is required."), {
        statusCode: 401,
      }));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(Object.assign(new Error("Permission denied."), { statusCode: 403 }));
      return;
    }

    next();
  };
}
