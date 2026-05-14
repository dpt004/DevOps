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

  async function shutdown(signal) {
    logger.warn("shutdown requested", { signal });
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  }

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start().catch((error) => {
  logger.error("backend failed to start", { error: error.message });
  process.exit(1);
});
