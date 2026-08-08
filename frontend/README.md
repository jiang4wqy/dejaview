# DejaView Frontend

Next.js App Router frontend for the intro → persona → project → progress → report flow. It uses TypeScript and repository-native CSS without a component framework.

See the [top-level README](../README.md) for the complete project and [Deployment](../docs/DEPLOYMENT.md) for server configuration.

## Run locally

Start the backend on `http://localhost:8000`, then:

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. The runtime `/api` route proxies to the local backend, so no frontend environment file is required.

## Checks

```bash
npm run typecheck
npm run audit
npm run build
npm run start
```

Requires Node.js 20.9+; CI and Docker use Node 22.

## Runtime variables

| Variable | Scope | Purpose |
|---|---|---|
| `DEJAVIEW_BACKEND` | Next.js server runtime | Backend origin used by the same-origin `/api` proxy; defaults to `http://localhost:8000` |
| `NEXT_PUBLIC_API_BASE` | Browser build-time | Optional separate public API origin; leave empty for the bundled same-origin setup |

Never put a model credential in a `NEXT_PUBLIC_*` variable.

## Code map

```text
app/
├── page.tsx                    coordinates the three-stage home flow
├── report/[jobId]/page.tsx     polling and terminal states
├── api/[...path]/route.ts      runtime backend proxy
└── globals.css                 ordered imports only
components/
├── ProjectForm.tsx             validation and submission
├── DemoPicker.tsx              pre-generated report links
├── StageProgress.tsx           live job state
└── ReportView.tsx              shared-fact report presentation
lib/
├── api.ts                      typed requests and friendly API errors
├── showcase-data.ts            homepage copy and examples
└── types.ts                    API contracts
styles/
├── base.css, intro.css, worlds.css
└── form.css, report.css, responsive.css
```

The serious, roast and comfort themes can change copy and presentation. They must not invent or mutate facts returned by the backend.
