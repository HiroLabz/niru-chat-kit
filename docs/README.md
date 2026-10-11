# niru-chat-kit docs

This folder holds the documentation site and live demo for `@hiro/niru-chat-kit`. It is a Vite, React and TypeScript app that builds to plain static files. It is its own pnpm project and is not part of the kit's workspace, so installing the kit from GitHub never installs these dependencies.

The site imports the kit from its source (`../src`), so it always shows the current code. The props tables are generated from the kit's TypeScript types each time you start the dev server or build (`scripts/extract-props.mjs` writes `src/generated/props.json`).

## Run it on your machine

1. Open a terminal in this folder.

   ```sh
   cd docs
   ```

2. Install the dependencies.

   ```sh
   pnpm install
   ```

3. Start the dev server.

   ```sh
   pnpm dev
   ```

   You should see a line with `http://localhost:5173`. Open it and the docs site appears.

To check the types without starting anything, run `pnpm typecheck`. If `pnpm` fails through corepack, put `npx pnpm@10` in front of any command, for example `npx pnpm@10 dev`.

## Build the site

```sh
pnpm build        # writes the static files to docs/dist
pnpm preview      # serves docs/dist locally so you can check it
```

When the build works, `docs/dist` contains `index.html`, an `assets` folder and `404.html`.

If the site will live in a sub-folder rather than at the domain root, as a GitHub Pages project site does, set `DOCS_BASE` before building:

```sh
DOCS_BASE=/niru-chat-kit/ pnpm build
```

The site uses hash addresses (`/#/core`, `/#/primitives/tool`), so every page is served by `index.html` on any static host and under any base path, and no server rewrites are needed. The build also writes `404.html`, a copy of `index.html`, so a typed address on GitHub Pages still opens the app.

The build copies `llms.txt` and `llms-full.txt` from the repo root into the site, so they are served at `<base>llms.txt`. If those files are missing, the build skips them.

## No network at runtime

The built page carries a Content-Security-Policy, a browser rule that allows it to load things only from its own address. Fonts are system fonts. The kit's `Source` component normally asks Google's favicon service for a small icon. At build time that request is replaced with a local icon (`vite.config.ts`). Code colouring uses the full Shiki build, so every Shiki language and theme works. Each language is its own file and is fetched only when a page shows that language, which is why the built site is about 13 MB. If a visitor turns on voice input, the browser uses its own speech service.

## Deploy

Pick one host. All three serve the same `docs/dist` folder.

### GitHub Pages

1. Move `docs/github-pages.yml.example` to `.github/workflows/docs.yml` in the repo root. GitHub only runs workflows from that folder.
2. In the repository on GitHub, open Settings, then Pages. Under Build and deployment, set Source to GitHub Actions.
3. Push to `main`. The workflow builds the site with `DOCS_BASE=/<repo-name>/`.
4. Open the Actions tab and wait for the Docs run to turn green.

When it worked, the site is at `https://<owner>.github.io/<repo-name>/` and the Introduction page loads with a working chat on it. The link also appears in the run's deploy step.

### Vercel

1. In Vercel, choose Add New, then Project, and import the repository.
2. Set Root Directory to `docs`. Leave the other settings alone: `vercel.json` already sets the build command (`pnpm build`), the output folder (`dist`) and the fallback to `index.html`.
3. Press Deploy.

When it worked, Vercel shows a green "Ready" status and a link. Open it and the Introduction page loads.

### Netlify

1. In Netlify, choose Add new site, then Import an existing project, and pick the repository.
2. Leave the build settings as they are. `netlify.toml` sets the base folder (`docs`), the command (`pnpm install --frozen-lockfile && pnpm build`), the publish folder (`dist`) and the fallback to `index.html`.
3. Press Deploy.

When it worked, the deploy log ends with "Site is live" and the site link opens the Introduction page.

## Folder layout

```
docs/
  src/
    pages/        Introduction, Installation, Theming, Core, JSXPreview safety
      docs/       One file per group of small-part and block pages: live examples and props
    demo/         The scripted replay transport and the full-screen demo
    components/   Example (preview and code tabs), PropsTable, Section helpers
    site/         Page frame, navigation, theme, light and dark mode
    fixtures/     Frozen sample conversations for the block pages
  scripts/        extract-props, copy-llms, spa-fallback
```

The Code tab of each example is cut from the same file as the live example (between `// #region` markers), so the code you read is the code that runs.

## The demo

`src/demo/replay-transport.ts` is a `ChatTransport` that lives in the browser tab. It replays scripted frames, the same kinds of frames a real backend sends, and it answers `branches` and `resume` calls, so regenerate, versions, edit, approvals and stop behave like the real thing. The scripts are in `scripts-*.ts`. Each one has a suggestion button and is chosen by keyword. To show a new feature in the demo, add a script.
