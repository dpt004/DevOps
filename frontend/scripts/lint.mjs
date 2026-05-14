import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const roots = process.argv.slice(2);
const failures = [];

async function collectFiles(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(path, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
    } else if (entry.isFile() && /\.(js|jsx|css)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

for (const root of roots) {
  const files = await collectFiles(root);
  for (const file of files) {
    const contents = await readFile(file, "utf8");

    if (/\t/.test(contents)) {
      failures.push(`${file}: contains tab indentation`);
    }

    if (/[ \t]$/m.test(contents)) {
      failures.push(`${file}: contains trailing whitespace`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Lint passed.");
