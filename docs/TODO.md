# Known Limitations and Boundaries

This file records current limitations. Planned work belongs in [BACKLOG.md](BACKLOG.md).

## Analysis quality

- Real search is best effort and source-dependent. Reports must be read as “within this run's search scope,” never as proof that no competitor exists.
- The built-in HTTP crawler does not fully reproduce every JavaScript-heavy or authenticated application flow.
- Private repositories, uploaded archives, intranet URLs and login-only products are not supported inputs.
- Mock mode is deterministic demonstration data; it does not validate a submitted project's real market position.
- The real evaluation set is still small. Duplication-score stability and fingerprint consistency need broader regression coverage.
- Token and monetary usage fields are not complete for every provider.

## Runtime and persistence

- The local defaults use an in-memory JobStore and background thread; process restarts discard jobs.
- The Render template also uses memory/thread mode. Use Compose with Redis/RQ or SQL storage when persistence matters.
- The shared access code is a deployment gate, not user accounts, tenant isolation or role-based authorization.
- Per-IP limiting only uses `X-Forwarded-For` from explicitly trusted proxies. A missing proxy configuration may group traffic under the proxy address; the global daily cap still protects total spend.

## Privacy, security and compliance

- Analyze public material only. Do not submit secrets, private source code, customer data or internal service addresses.
- Respect robots.txt, site terms, repository licenses and source rate limits.
- Reports are private by convention, not encrypted per user. Anyone with the shared access code and job ID may read a job on that deployment.
- Real API keys belong only in ignored backend `.env` files or deployment-platform secret stores.
- Generated judgments are advisory and may be wrong; they are not legal, investment or market guarantees.

## Product invariants

- Tone-specific reports may change wording but must not add facts outside the shared fact layer.
- Critique targets the project, not the developer.
- Missing evidence must lower confidence or remain unknown.
- Any change to scoring or schemas needs tests and an explicit compatibility note.
