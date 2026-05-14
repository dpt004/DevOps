import { createApp } from "../src/app.js";

const app = createApp();

if (!app || typeof app.listen !== "function") {
  throw new Error("Express app failed to initialize.");
}

console.log("Backend build check passed.");
