// Responsive regression check. Serves docs/dist, opens every page in the site navigation plus the
// demo (a plain chat, replies with tools, a table, code, an approval card, questions (open, with answers and answered), sources, a running call and
// the minimised call strip) at four widths in light and dark, and fails when a page scrolls sideways
// or the call stage does not cover the screen. Screenshots for review go to docs/test-results/.
//
//   pnpm check:responsive                 builds the docs first, then checks
//   pnpm check:responsive -- --skip-build checks the dist that is already there
//   pnpm check:responsive -- --only=demo  limits the run to routes that contain the text
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const shots = join(root, "test-results");
const args = process.argv.slice(2);
const only = args.find((arg) => arg.startsWith("--only="))?.slice(7);

const WIDTHS = [320, 390, 768, 1280];
const MODES = ["light", "dark"];
const HEIGHT = 844;
const SHOT_WIDTH = 390;
const SHOT_PAGES = new Set(["/", "/demo", "/demo+call", "/demo+tools", "/demo+markdown", "/demo+code", "/demo+approval", "/demo+question", "/demo+question-open", "/demo+answered", "/demo+drawer", "/demo+strip", "/blocks/composer", "/blocks/conversation", "/blocks/full-chat", "/primitives/tool"]);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".txt": "text/plain", ".woff2": "font/woff2" };

if (!args.includes("--skip-build")) {
  const build = spawnSync("pnpm", ["run", "build"], { cwd: root, stdio: "inherit" });
  if (build.status !== 0) process.exit(build.status ?? 1);
}
if (!existsSync(join(dist, "index.html"))) {
  console.error("docs/dist/index.html is missing: run without --skip-build.");
  process.exit(1);
}

const server = createServer((request, response) => {
  const clean = normalize(decodeURIComponent((request.url ?? "/").split("?")[0])).replace(/^(\.\.[/\\])+/, "");
  let file = join(dist, clean);
  if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) file = join(dist, "index.html");
  response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  response.end(readFileSync(file));
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = `http://127.0.0.1:${server.address().port}`;

/** Runs inside the page: how wide the page is, and which elements poke past the right edge. */
const measure = () => {
  const vw = document.documentElement.clientWidth;
  const clipped = (node, inclusive = false) => {
    for (let parent = inclusive ? node : node.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (style.overflowX !== "visible" && parent.getBoundingClientRect().right <= vw + 1) return true;
    }
    return false;
  };
  const offenders = [];
  const report = (node, right) => {
    const element = node.nodeType === 1 ? node : node.parentElement;
    const name = element.getAttribute("data-testid") || element.getAttribute("aria-label") || element.className?.toString().split(" ")[0] || "";
    const text = node.nodeType === 3 ? ` "${node.textContent.trim().slice(0, 24)}"` : "";
    offenders.push(`${element.tagName.toLowerCase()}${name ? `[${name}]` : ""}${text} right=${Math.round(right)}`);
  };
  // Elements, then the text inside them: a long word can poke out of a box whose own edge is inside the screen.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node && offenders.length < 5; node = walker.nextNode()) {
    const element = node.nodeType === 1 ? node : node.parentElement;
    if (!element || getComputedStyle(element).visibility === "hidden" || clipped(element, node.nodeType === 3)) continue;
    let right = 0;
    if (node.nodeType === 1) {
      const rect = node.getBoundingClientRect();
      right = rect.width === 0 ? 0 : rect.right;
    } else if (node.textContent.trim()) {
      range.selectNodeContents(node);
      right = Math.max(0, ...Array.from(range.getClientRects()).map((rect) => rect.right));
    }
    if (right > vw + 1) report(node, right);
  }
  // Text that a box with overflow hidden cuts off at its edge (a reply "cut off on the right") is a problem even
  // though the page itself does not scroll. Boxes that truncate on purpose (ellipsis) and scrollers are fine.
  const cut = [];
  const texts = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = texts.nextNode(); node && cut.length < 5; node = texts.nextNode()) {
    // KaTeX keeps a visually hidden MathML copy of each formula for screen readers; it is clipped on purpose.
    if (!node.textContent.trim() || !node.parentElement || node.parentElement.closest(".katex-mathml")) continue;
    range.selectNodeContents(node);
    const rects = Array.from(range.getClientRects());
    const right = Math.max(0, ...rects.map((rect) => rect.right));
    if (right === 0) continue;
    for (let box = node.parentElement; box && box !== document.body; box = box.parentElement) {
      const style = getComputedStyle(box);
      if (style.textOverflow === "ellipsis" || style.webkitLineClamp !== "none" || style.overflowX === "auto" || style.overflowX === "scroll") break;
      if ((style.overflowX === "hidden" || style.overflowX === "clip") && right > box.getBoundingClientRect().right + 1 && box.clientWidth > 0) {
        cut.push(`"${node.textContent.trim().slice(0, 24)}" runs to ${Math.round(right)} inside a box that ends at ${Math.round(box.getBoundingClientRect().right)}`);
        break;
      }
    }
  }
  return { cut, vw, scrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body.scrollWidth, offenders };
};

const stageRect = () => {
  const stage = document.querySelector('[data-testid="call-stage"]');
  if (!stage) return null;
  const rect = stage.getBoundingClientRect();
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, vw: document.documentElement.clientWidth, vh: window.innerHeight };
};

const shotName = (id) => id.replace(/[/+]/g, "-").replace(/^-/, "") || "home";

const failures = [];
const record = (label, problem) => {
  failures.push(`${label}: ${problem}`);
  console.log(`  FAIL ${label}: ${problem}`);
};

async function settle(page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
}

async function waitForReply(page) {
  const running = () => page.locator('[aria-label="Stop"]').count();
  await page.locator('[aria-label="Stop"]').first().waitFor({ state: "attached", timeout: 5000 }).catch(() => undefined);
  // Done when the Stop button has stayed away for a second (it can blink off between steps).
  for (let quiet = 0, waited = 0; quiet < 4 && waited < 60000; waited += 250) {
    await page.waitForTimeout(250);
    quiet = (await running()) === 0 ? quiet + 1 : 0;
  }
  await settle(page);
}

/** Sends one of the demo's starters by typing its words into the message box. */
async function ask(page, text) {
  const box = page.getByRole("textbox").last();
  await box.fill(text);
  await box.press("Enter");
  // The refund script waits for an answer; the others run to the end.
  await waitForReply(page);
}

async function inspect(page, label, { width, mode, shot, covering }) {
  const result = await page.evaluate(measure);
  if (result.scrollWidth > result.vw || result.bodyScrollWidth > result.vw) {
    record(label, `page is ${Math.max(result.scrollWidth, result.bodyScrollWidth)}px wide on a ${result.vw}px screen; reaching past: ${result.offenders.join(", ") || "nothing found"}`);
  }
  if (result.cut.length > 0) record(label, `text is cut off: ${result.cut.join("; ")}`);
  if (covering) {
    const rect = await page.evaluate(stageRect);
    const slack = 1;
    if (!rect) record(label, "the call stage is not on the page");
    else if (rect.left > slack || rect.top > slack || rect.right < rect.vw - slack || rect.bottom < rect.vh - slack) {
      record(label, `call stage covers x ${Math.round(rect.left)}..${Math.round(rect.right)} y ${Math.round(rect.top)}..${Math.round(rect.bottom)} of a ${rect.vw} x ${rect.vh} screen`);
    }
  }
  if (shot && width === SHOT_WIDTH) {
    await page.screenshot({ path: join(shots, `${shot}-${mode}-${width}.png`) });
  }
}

const DEMO_SCENES = [
  { id: "/demo", run: async () => undefined },
  { id: "/demo+tools", run: (page) => ask(page, "Run some tools for me") },
  { id: "/demo+markdown", run: (page) => ask(page, "Show me markdown and a table") },
  { id: "/demo+code", run: (page) => ask(page, "Write code in a few languages") },
  { id: "/demo+approval", run: (page) => ask(page, "Issue a 250 refund") },
  { id: "/demo+question", run: (page) => ask(page, "Tailor my Cebu plan to 3 days") },
  { id: "/demo+question-open", run: (page) => ask(page, "Move my delivery date") },
  {
    id: "/demo+answered",
    run: async (page) => {
      await ask(page, "Tailor my Cebu plan to 3 days");
      await page.getByRole("button", { name: /Mactan/ }).click();
      await page.getByText("Here is a 3-day plan").waitFor({ timeout: 10000 });
      await waitForReply(page);
    },
  },
  { id: "/demo+sources", run: (page) => ask(page, "Answer with sources") },
  {
    id: "/demo+drawer",
    run: async (page, width) => {
      if (width >= 900) return;
      await page.getByRole("button", { name: "Conversations" }).click();
      await page.waitForTimeout(400);
    },
  },
  {
    id: "/demo+call",
    covering: true,
    run: async (page) => {
      await page.getByRole("button", { name: "Start a call" }).click();
      await page.getByTestId("call-stage").waitFor();
      await page.waitForTimeout(2500);
    },
  },
  {
    id: "/demo+strip",
    run: async (page) => {
      await page.getByRole("button", { name: "Start a call" }).click();
      await page.getByTestId("call-stage").waitFor();
      await page.keyboard.press("Escape");
      await page.getByTestId("call-strip").waitFor();
      await page.waitForTimeout(500);
    },
  },
];

mkdirSync(shots, { recursive: true });

const browser = await chromium.launch();
let checked = 0;
try {
  // The routes come from the navigation the visitor sees, not from a list kept here.
  const probe = await browser.newPage({ viewport: { width: 1280, height: HEIGHT } });
  await probe.goto(`${origin}/#/`);
  await probe.locator('nav[aria-label="Documentation"] a').first().waitFor();
  const paths = await probe.$$eval('nav[aria-label="Documentation"] a', (links) => links.map((link) => link.getAttribute("href")?.replace(/^#/, "") ?? ""));
  await probe.close();
  const routes = [...new Set(paths.filter(Boolean))];
  console.log(`${routes.length} pages from the navigation, ${DEMO_SCENES.length} demo scenes`);

  for (const mode of MODES) {
    for (const width of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height: HEIGHT }, colorScheme: mode, deviceScaleFactor: 1, isMobile: false });
      await context.addInitScript((value) => {
        localStorage.setItem("nck-docs-mode", value);
        localStorage.removeItem("nck-docs-demo");
      }, mode);
      await context.grantPermissions([]);
      const page = await context.newPage();
      page.on("pageerror", (error) => record(`${mode} ${width}`, `script error: ${error.message}`));

      for (const route of routes) {
        if (only && !route.includes(only)) continue;
        const label = `${route} ${mode} ${width}`;
        await page.goto(`${origin}/#${route}`);
        await settle(page);
        await inspect(page, label, { width, mode, shot: SHOT_PAGES.has(route) ? shotName(route) : null });
        checked += 1;
      }
      for (const scene of DEMO_SCENES) {
        if (only && !scene.id.includes(only)) continue;
        const label = `${scene.id} ${mode} ${width}`;
        await page.goto(`${origin}/#/demo`);
        await page.reload();
        await settle(page);
        await scene.run(page, width);
        await inspect(page, label, { width, mode, shot: SHOT_PAGES.has(scene.id) ? shotName(scene.id) : null, covering: scene.covering });
        checked += 1;
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}

console.log(`${checked} page states checked at ${WIDTHS.join(", ")} px in ${MODES.join(" and ")}; screenshots in ${shots}`);
if (failures.length > 0) {
  console.error(`\n${failures.length} problem${failures.length === 1 ? "" : "s"}:`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log("No page scrolls sideways and the call stage covers the screen.");
