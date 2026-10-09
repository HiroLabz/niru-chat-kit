# Contributing

## Setup, test, build

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

Node 20 or newer (CI uses 22).

## Rules

- Two layers. `src/core` has no UI library: it must not import `@mui/*` or anything from `src/mui`. `src/mui` may import core. Neither imports anything outside this package. `src/boundaries.test.ts` fails on a violation.
- Files are at most 400 lines. Split before you reach it.
- Colours come only from tokens (`useChatKitStyles` / the token set). No hard-coded colour values in components.
- Heavy optional libraries (shiki, remark-math, rehype-katex, the katex stylesheet) stay dynamic imports.
- Add or update a test with every behaviour change. Update `CHANGELOG.md` for anything a consumer would notice.
