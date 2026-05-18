import { createServer } from "node:http";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { migrate, seed } from "./db/schema.js";
import { closePool } from "./db/pool.js";
import { logger } from "./logger.js";

async function start() {
  await migrate();
  await seed();

  const app = createApp();
  const server = createServer(app);

  server.listen(config.port, () => {
    logger.info("backend listening", {
      port: config.port,
      environment: config.nodeEnv,
    });
  });

  // Keep-alive timeout must be > Nginx proxy_read_timeout
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  let isShuttingDown = false;

  async function shutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.warn("shutdown requested", { signal });

    // Stop accepting new connections
    server.close(async () => {
      logger.info("http server closed");
      await closePool();
      process.exit(0);
    });

    // Force exit after 10 seconds if graceful shutdown hangs
    setTimeout(() => {
      logger.error("forced shutdown after timeout");
      process.exit(1);
    }, 10000).unref();
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((error) => {
  logger.error("backend failed to start", { error: error.message });
  process.exit(1);
});
