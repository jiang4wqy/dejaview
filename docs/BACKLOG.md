# Contributor Backlog

This list contains work that is genuinely unfinished. Before starting a large item, open an Issue with the proposed scope and verification method. See [CONTRIBUTING.md](../CONTRIBUTING.md).

## Priority 0 · Evaluation and correctness

- [ ] Build a licensed, reviewable evaluation set of 20–30 projects across obvious duplication, clear differentiation and ambiguous cases.
- [ ] Add fingerprint-consistency and duplication-score stability regression checks across repeated runs and provider upgrades.
- [ ] Measure candidate recall and classification quality instead of relying only on end-report inspection.
- [ ] Complete token and estimated-cost accounting for every real LLM provider.
- [ ] Add regression cases for missing evidence, conflicting claims and partial provider failures.

## Priority 1 · Search and evidence

- [ ] Improve query generation and candidate deduplication with measured recall.
- [ ] Add reliable, terms-compliant product and Chinese-community sources with source-specific tests.
- [ ] Improve focused repository reading so the verifier reads only the files needed to answer open questions.
- [ ] Add explicit license/activity metadata to verified repository candidates.
- [ ] Improve JavaScript-heavy site analysis while preserving URL/network safety controls.

## Priority 1 · Deployment and operations

- [ ] Add a container integration test that waits for frontend, API, Redis and worker health and completes one mock job.
- [ ] Document and test SQL schema upgrades before treating SQL JobStore as long-lived production storage.
- [ ] Add structured secret redaction tests for provider and proxy error paths.
- [ ] Add backup/restore examples for Redis and Postgres deployments.

## Priority 2 · Product and accessibility

- [ ] Add automated browser tests for intro → persona → form → mock report, demo deep links, access-code expiry and error states.
- [ ] Add automated accessibility checks for keyboard flow, focus order, contrast and reduced motion.
- [ ] Add project-version history and side-by-side recheck comparison without introducing a full account system.
- [ ] Add an English UI only after copy, routing and report-language contracts are defined.

## Good first issues

- [ ] Add focused tests for an existing provider's invalid configuration and timeout behavior.
- [ ] Improve a concrete error message with a reproducible failure case.
- [ ] Fix a verified documentation inconsistency or broken internal link.
- [ ] Add a small accessibility improvement with before/after browser evidence.

## Out of scope without design discussion

Accounts, billing, public leaderboards, private-repository upload, autonomous-agent orchestration, and changes to the shared fact-layer invariant require a separate proposal. They should not be added as incidental changes to another PR.
