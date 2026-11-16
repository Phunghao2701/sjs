# Task: Refactor a Backend to Cloudflare Workers

## Goal

Move the selected backend/API to Cloudflare Workers while preserving its externally visible behavior and security guarantees. Make the smallest staged change that works with the repository's actual framework, data model, and deployment setup.

This task is repository-agnostic. Before implementation, replace the optional placeholders below with facts from the target repository; do not assume a particular language, framework, database, identity provider, or Cloudflare product.

| Item | Target repository value |
| --- | --- |
| Backend/API directory | `[[inspect and fill]]` |
| Current runtime/framework | `[[inspect and fill]]` |
| Required routes/use cases | `[[list or link]]` |
| Current persistence/services | `[[inspect and fill]]` |
| Target Worker entrypoint/environment | `[[inspect and fill]]` |

## Required workflow

### 1. Inspect and establish the baseline

- Read repository instructions, architecture notes, package manifests, environment examples, route definitions, middleware, persistence code, and existing checks before changing code.
- Inventory each in-scope endpoint/use case: method, path, authentication/authorization, input, response shape, status codes, pagination, validation, side effects, and error behavior.
- Record current lint, type-check, build, and test commands from the repository. Capture the baseline results where practical.
- Identify existing local changes and preserve them. Work on a feature branch and keep the change scoped to this migration.

### 2. Produce a runtime compatibility and migration plan

Before porting handlers, create a concise compatibility matrix for the backend's runtime APIs, dependencies, persistence clients, and background work. Mark each item as:

- compatible as-is;
- compatible with configuration or a supported package version;
- needs a Worker-native adapter/binding;
- needs an external service or a different execution model; or
- out of scope / blocked, with the reason and impact.

Check the **current official Cloudflare documentation** for the chosen compatibility date, Node.js API support, package requirements, bindings, local development behavior, quotas, and request/CPU/runtime limits. Do not infer support solely because a package bundles or type-checks successfully. Call out filesystem/process access, native modules, raw sockets, server listeners, large synchronous CPU work, long-lived jobs, unsupported database drivers, and mutable process-global state when present.

The migration plan must map every in-scope route/use case to its Worker implementation and name any behavior that cannot be preserved without an infrastructure or product decision. Pause only for a decision that materially changes data ownership, public API behavior, cost, or security; continue independent work meanwhile.

### 3. Design the Worker boundary

- Use the repository's existing framework/router when it is supported and adds value; otherwise use a small Worker-compatible router. Avoid a framework rewrite without a demonstrated compatibility need.
- Keep the existing request/response contract unless an intentional API change is explicitly approved. If a change is unavoidable, document the old/new contract and provide a compatibility path where feasible.
- Define Worker environment bindings and types from the actual configuration. Separate non-secret configuration from secrets. Use Cloudflare bindings for Cloudflare resources where appropriate and select storage only after comparing the existing consistency, query, transaction, retention, and ownership requirements.
- Preserve authentication and authorization at the server boundary. Validate identity on every protected operation and enforce ownership/tenant boundaries in the data store or trusted service, not only in frontend checks.
- Define CORS allowlists, input validation, safe error responses, logging/redaction, timeouts, retry/idempotency behavior, and provider rate limiting consistently with the existing product.
- For scheduled, queued, streaming, or long-running work, choose a supported execution model (for example Queues, Cron Triggers, Durable Objects, or an external job service) based on the actual workload. Do not silently turn a durable job into a request that may exceed Worker limits.
- Do not rely on isolate memory for durable or cross-request state. Any cache must have an explicit key, scope, freshness/eviction policy, and invalidation behavior.

### 4. Implement incrementally

- Move or adapt business logic behind Worker-compatible request handlers; keep domain logic independent of HTTP/runtime details when practical.
- Preserve validation, authorization, status codes, response fields, pagination/cursors, and side effects for every in-scope use case.
- Use explicit environment bindings for databases, object storage, queues, caches, and provider credentials. Never expose secrets through client bundles, logs, source control, or example values that look real.
- Keep local-only credentials in ignored local configuration. Update example configuration with variable names and empty/descriptive placeholders only.
- Avoid migrating production data, changing schemas, changing authentication providers, deploying, or changing unrelated services unless separately authorized.
- Update repository documentation with local run instructions, required bindings, deployment prerequisites, and any remaining limitations.

### 5. Verify behavior and operational readiness

- Run the repository's applicable lint, type-check, build, and tests using commands from its manifests/docs. Add or update focused tests for route contracts, authorization/ownership, validation, error handling, and important side effects.
- Run the Worker locally with representative local bindings or safe mocks. Smoke-test every in-scope route, including unauthenticated and unauthorized cases, pagination, malformed input, provider failure, and preflight requests where applicable.
- Verify that the Worker bundle does not depend on unsupported Node/runtime APIs or undeclared environment variables. Confirm that local configuration and secrets are ignored and absent from the diff.
- If storage, bindings, or schema configuration changed, validate the generated types/config and the local integration path using the repository's documented commands.
- Do not deploy or alter production resources as part of this task unless deployment was explicitly requested.

## Acceptance criteria

- [ ] The compatibility matrix and route/use-case mapping are included in the PR or task notes.
- [ ] All agreed in-scope routes/use cases run through the Worker and preserve their documented contract and authorization rules.
- [ ] Unsupported runtime APIs, dependencies, persistence access, and long-running work have an implemented replacement or a clearly documented blocker and impact.
- [ ] Required bindings and secrets are explicit, typed where supported, and documented; no secret value is committed or exposed to clients.
- [ ] Applicable repository checks pass, and the PR reports the exact commands/results plus any checks that could not run.
- [ ] Local Worker setup and smoke-test steps are documented and repeatable.
- [ ] No production deployment, data migration, or unrelated product change occurred without explicit authorization.

## Required handoff

Include in the PR/task completion note:

1. Routes/use cases migrated and any contract differences.
2. Compatibility decisions and any infrastructure choices that need follow-up.
3. Bindings/secrets required by name only (never values).
4. Local run and verification commands with actual results.
5. Known limitations, deployment prerequisites, and any work intentionally left out.

## Official Cloudflare references

Check these pages again during implementation because runtime support, configuration, and limits can change:

- [Workers documentation](https://developers.cloudflare.com/workers/)
- [Node.js compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)
- [Bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/)
- [Environment variables](https://developers.cloudflare.com/workers/configuration/environment-variables/)
- [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
