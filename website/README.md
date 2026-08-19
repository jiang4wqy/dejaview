# DejaView — 宣传站 / Landing site

A standalone, bilingual (中文默认 · English) marketing site for
[DejaView](https://github.com/jiang4wqy/dejaview), built to earn GitHub stars.
It is **fully static** and **independent of the product**: it does not import
from `frontend/`, call the `backend/`, hit any API, or spend model quota. Every
number and quote in the "verdict" and "personas" sections comes verbatim from the
repo's own pre-generated `gitingest` report
(`frontend/public/demos/gitingest.json`) — 事实不能主观.

Deployed to **https://jiang4wqy.github.io/dejaview/** via GitHub Actions
(`.github/workflows/pages.yml`).

## Stack

React + TypeScript + Vite. No UI framework, no animation library, no web fonts —
system font stacks only, inline SVG icons, all motion in CSS + React state +
`IntersectionObserver`. Respects `prefers-reduced-motion`.

## Develop

```sh
cd website
npm install         # dev tooling only
npm run dev         # http://localhost:5173/dejaview/
```

## Build & verify

```sh
npm run typecheck   # tsc --noEmit
npm run build       # tsc --noEmit && vite build  ->  dist/
npm run preview     # serve dist/ at /dejaview/
```

The build sets `base: '/dejaview/'`, so every asset resolves under the Pages
sub-path. For a root-hosted preview: `BASE_PATH=/ npm run build`.

## Structure

```text
website/
├── index.html            # shell + <noscript> fallback + favicon
├── vite.config.ts        # base: '/dejaview/'
├── src/
│   ├── main.tsx           # entry, wraps App in <LanguageProvider>
│   ├── App.tsx            # section assembly
│   ├── styles.css         # the whole "digital forensics lab" design system
│   ├── content/copy.ts    # ALL strings, zh + en, same shape (real report data)
│   ├── lib/lang.tsx       # language context + localStorage persistence
│   ├── hooks/             # useInView, usePrefersReducedMotion
│   ├── components/        # Header, Hero (+scan terminal), Problem, Workflow,
│   │                      #   VerdictDemo (dial), Personas, FinalCta, Footer …
│   └── assets/            # logo + three theme screenshots (copied, originals kept)
└── public/               # favicon.svg, logo.png (favicon / noscript)
```

## Deploy (one-time repo setting)

The `pages.yml` workflow builds and deploys on every push to `main` that touches
`website/**`. Before the first run, set **Settings → Pages → Source: GitHub
Actions** in the repository. The workflow only requests Pages permissions; it does
not touch the product CI (`ci.yml`) or the Render deployment.

## Boundaries

This folder and `.github/workflows/pages.yml` are self-contained. The site
intentionally does not reach into the product code, so the two can evolve
independently.

MIT © jiang4wqy
