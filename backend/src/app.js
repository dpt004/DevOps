import cors from "cors";
import express from "express";
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

export function createApp() {
  const app = express();

  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: "1mb" }));

  app.use((req, res, next) => {
    logger.info("request", { method: req.method, path: req.path });
    next();
  });

  app.get("/", (req, res) => {
    res.json({
      service: "attendance-backend",
      docs: "/api/health",
    });
  });

  app.use("/api", apiRouter);

  app.use((req, res) => {
    res.status(404).json({
      error: "not_found",
      message: "Route not found.",
    });
  });

  app.use((error, req, res, _next) => {
    const statusCode = error.statusCode || 500;
    logger.error("request failed", {
      method: req.method,
      path: req.path,
      statusCode,
      error: error.message,
    });

    res.status(statusCode).json({
      error: statusCode >= 500 ? "internal_error" : "bad_request",
      message: error.message,
    });
  });

  return app;
}
