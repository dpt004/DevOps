import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { apiRouter } from "./routes/index.js";

function corsOrigin(origin, callback) {
  if (config.corsOrigin === "*") {
    callback(null, true);
    return;
  }

  const allowed = config.corsOrigin.split(",").map((item) => item.trim());
  if (!origin || allowed.includes(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error("CORS origin is not allowed."));
}

// Rate limiter for authentication endpoints (login / register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "too_many_requests",
    message: "Quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.",
  },
});

export function createApp() {
  const app = express();

  if (config.trustProxy) {
    app.set("trust proxy", config.trustProxy);
  }

  // Security headers
  app.use(helmet({ contentSecurityPolicy: false }));

  // CORS
  app.use(cors({ origin: corsOrigin }));

  // Body parsing
  app.use(express.json({ limit: "1mb" }));

  // Request logging with response time
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      logger.info("request", {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Date.now() - start,
      });
    });
    next();
  });

  // Root health route
  app.get("/", (req, res) => {
    res.json({
      service: "attendance-backend",
      docs: "/api/health",
    });
  });

  // Rate limit on auth endpoints
  app.use("/api/auth", authLimiter);

  // API routes
  app.use("/api", apiRouter);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: "not_found",
      message: "Route not found.",
    });
  });

  // Global error handler — hide internal details from clients
  app.use((error, req, res, _next) => {
    const statusCode = error.statusCode || 500;
    logger.error("request failed", {
      method: req.method,
      path: req.path,
      statusCode,
      error: error.message,
      ...(statusCode >= 500 && { stack: error.stack }),
    });

    res.status(statusCode).json({
      error: statusCode >= 500 ? "internal_error" : "bad_request",
      message:
        statusCode >= 500
          ? "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau."
          : error.message,
    });
  });

  return app;
}
