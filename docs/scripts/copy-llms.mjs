// Copies the kit's llms.txt and llms-full.txt (repo root) into public/, so the site serves them at
// <base>llms.txt. Skips quietly when the kit has none.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(resolve(root, "public"), { recursive: true });
for (const name of ["llms.txt", "llms-full.txt"]) {
  const from = resolve(root, "..", name);
  if (existsSync(from)) {
    copyFileSync(from, resolve(root, "public", name));
    console.log(`copied ${name}`);
  } else {
    console.log(`${name} not found, skipped`);
  }
}
