// The site uses a hash router, so every route is index.html. A host that serves 404.html for an
// unknown path (GitHub Pages) still gets the app this way.
import { copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dist = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist");
copyFileSync(resolve(dist, "index.html"), resolve(dist, "404.html"));
console.log("wrote dist/404.html");
