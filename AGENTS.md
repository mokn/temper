# Temper Workflow

This repo is the public Temper codebase. Keep product doctrine in the repo and keep private design work on the local machine.

## Startup

1. Read this file.
2. Read `SESSION.md`.
3. Read `CLAUDE.md`.
4. Check `git worktree list` and `git status -sb`.

## Repo Map

- `packages/cli/` — Temper CLI implementation
- `canon/` — shared doctrine source
- `derived/` — generated canon artifacts that ship with the repo
- `README.md` — public product framing

## Rules

- Private design, spec, and research docs live under `~/Documents/temper/docs/`. Do not reintroduce them under repo `docs/`.
- Root `HANDOFF_*.md` files are local-only working artifacts. Keep them ignored and archive durable copies under `~/Documents/temper/docs/handoffs/`.
- `SESSION.md` is tracked here on purpose. Keep it short, product-facing, and safe to publish.
- Worktree names are operator scaffolding, not product identity. Do not leak local worktree naming into public docs unless it matters.
- When you edit canon, update the derived artifacts in the same change.
- For CLI changes, keep the install path human-readable and reversible. Prefer preview, inspect, and uninstall-friendly behavior.

## Verification

- Baseline: `pnpm test`
- When touching onboarding, install, or trust flows, also do a disposable smoke run against a real target repo when practical.
