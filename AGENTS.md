# Escanor Strategy Lab Agent Instructions

These instructions apply to every task in this folder. `project.md` is the product source of truth. Read the relevant parts of it before planning, changing, reviewing, testing, or deploying the application.

## Mandatory skill routing

Project skills are installed in `.agents/skills`. Agent-specific folders are compatibility links or generated copies; treat `.agents/skills` as canonical and do not edit the compatibility locations directly.

Before taking substantive action on any prompt:

1. Classify the task against the routing table below.
2. If one or more skills match, state which skills will be used and why.
3. Read every selected `SKILL.md` completely before acting. Read the references it routes to when they apply.
4. Follow all applicable skills. For multi-domain work, use the smallest complete set rather than selecting only one.
5. If a selected skill is unavailable or cannot be followed, state the limitation and continue with the safest supported workflow.
6. Do not invoke an unrelated skill merely because it is installed.

Explicit skill requests always take precedence: when the user names an installed skill, use it.

## Skill routing table

### `domain-modeling`

Use for domain terminology, entity boundaries, relationships, invariants, statuses, workflow rules, ADRs, or changes to the Strategy -> Strategy Version -> Backtest model. Combine it with `supabase-postgres-best-practices` when the model becomes database schema or SQL.

### `vercel-react-best-practices`

Use whenever writing, reviewing, debugging, or refactoring React or Next.js code, including components, App Router pages, layouts, route handlers, Server Components, data fetching, rendering, bundling, and performance.

### `frontend-design`

Use when creating or substantially reshaping user-visible UI: dashboards, forms, tables, drawers, navigation, responsive layouts, visual hierarchy, typography, Tailwind, or shadcn/ui composition.

### `web-design-guidelines`

Use for UI, UX, accessibility, interaction, or responsive-design reviews. Also use it as the review pass before declaring a substantial frontend feature complete.

### `supabase-postgres-best-practices`

Load before writing or changing any PostgreSQL or Supabase artifact: schema, migrations, tables, columns, types, constraints, indexes, RLS policies, functions, triggers, queries, database tests, imports, restores, or performance work.

### `security-guidance`

Use automatically when planning or implementing anything involving user input, authentication, authorization, RLS, data persistence, HTTP/network communication, secrets, file upload/download/storage, cryptography, logging, or privileged operations. Apply the relevant OWASP ASVS references bundled with the skill.

### `security-threat-model`

Use only when the user explicitly asks for threat modeling, abuse-path analysis, attacker analysis, or an AppSec threat model. Do not substitute it for ordinary secure implementation; use `security-guidance` for that.

### `webapp-testing`

Use when running or designing browser-based verification, Playwright tests, UI debugging, screenshots, console-log inspection, or end-to-end validation of a local web application.

### `code-review`

Use when the user asks to review a branch, PR, diff, commit range, or work-in-progress changes against standards and a specification. Follow its fixed-point requirements. Do not invoke it for ordinary implementation unless a review is requested.

### `deploy-to-vercel`

Use only when the user explicitly asks for a Vercel preview or production deployment, a live URL, or to push the application live. Never deploy merely because a build or implementation task is complete.

## Common combinations

- New Next.js UI: `frontend-design` + `vercel-react-best-practices`; add `web-design-guidelines` for the completion review and `webapp-testing` for live verification.
- Database or RLS change: `domain-modeling` when domain behavior changes + `supabase-postgres-best-practices` + `security-guidance`.
- Authentication, roles, or team management: `supabase-postgres-best-practices` + `security-guidance`; add React/design skills when UI is involved.
- Attachment upload or download: `security-guidance` + `supabase-postgres-best-practices`; add frontend and testing skills as needed.
- End-to-end feature: select every applicable implementation skill, then `webapp-testing`; use `code-review` only if review is requested and `deploy-to-vercel` only if deployment is requested.

## Project invariants

Preserve these rules from `project.md` in every implementation:

- Version 1 is a private research-management application, not a backtesting engine or trading-execution system.
- Strategy, Strategy Version, and Backtest are separate entities. Backtests never overwrite earlier experiments.
- TradingView, Freqtrade, Python, Codex, Manual, and Other results map to one canonical backtest schema.
- Store metrics using numeric database types. Use `NULL` when a metric is unavailable; do not use zero as a substitute.
- Enforce Owner, Editor, and Viewer permissions server-side and through PostgreSQL RLS. Hidden frontend controls are not authorization.
- Prefer archive and restore over destructive deletion. Important writes must preserve actor, timestamp, and activity history.
- Treat strategy research and attachments as private. Never expose the service-role key or other secrets to client code.
- Design list queries for at least 10,000 backtests using server-side pagination/filtering and appropriate indexes; do not load the entire database into the browser.
- Keep MVP scope focused. Do not add automated backtesting, live exchange integration, AI strategy generation, or unnecessary infrastructure unless the user explicitly changes scope.

## Completion and verification

- Validate work against the applicable acceptance criteria in `project.md`.
- Database and authorization work requires migration/schema validation plus role/RLS tests.
- Frontend work requires type/lint checks and focused behavior tests; substantial UI work also requires a browser and accessibility review.
- Security-sensitive work must identify the applied ASVS controls and verify authorization on the server boundary.
- Never claim deployment, production readiness, backup recoverability, security, or performance without direct evidence.
- In the final handoff, name the skills used and summarize the verification performed.

