# Handoff — Temper UD Operator

## Branch / Worktree

- Worktree: `/Users/michaelorourke/temper-worktrees/ud-operator`
- Branch: `feat/ud-operator`
- Status: clean

## Commits In This Workstream

- `b66f5c3` `feat: add project adoption and ship flows`
- `8943dda` `docs: add init adopt and UD overlay canon`

Relevant prior foundation on this branch:

- `c611827` `feat: add repo-aware coached commands`
- `685a490` `feat: add coach doctrine router`
- `0660f00` `feat: deepen hat canon personas`
- `d6f474b` `feat: seed doctrine canon and local retrieval`

## What Was Done

Implemented the first real operating layer that lets Temper point at an existing game repo instead of only reasoning about itself.

### Runtime

- Added project analysis and config generation in `packages/cli/src/lib/project-analysis.mjs` and `packages/cli/src/lib/project-config.mjs`
- Added assistant adapter generation in `packages/cli/src/lib/assistant.mjs`
- Added executable `ship lite` / `ship full` orchestration in `packages/cli/src/lib/ship.mjs`
- Reworked `packages/cli/src/index.mjs` so `init`, `adopt`, `assistant`, and `ship` are real command surfaces
- Tightened `packages/cli/src/lib/coach.mjs` so repo-aware routing ignores Temper’s own generated assistant files when inferring gameplay/design context

### Tests

- Added `packages/cli/test/project-ops.test.mjs`
- Full suite now passes with `pnpm test`

### Canon / Docs

- Added capability canon:
  - `canon/capabilities/init.md`
  - `canon/capabilities/adopt.md`
- Added architecture overlays:
  - `canon/architecture/overlays/browser-typescript-monorepo.md`
  - `canon/architecture/overlays/mud-onchain-live-service.md`
- Updated README and regenerated derived manifests/chunks

## What Was Verified

- `pnpm test` passes on `feat/ud-operator`
- `temper adopt --cwd /Users/michaelorourke/ultimate-dominion` correctly infers:
  - family: `data-driven-progression-rpg`
  - stack: `browser-typescript-monorepo`
  - package manager: `pnpm`
  - useful source-of-truth candidates
  - useful `ship lite` / `ship full` hooks
- End-to-end CLI smoke:
  - temp UD-like repo
  - `temper adopt --write`
  - `temper ship full --dry-run`
  - correct environment and hat routing

## What Didn’t Work At First

- Environment inference was initially too script-driven
  - Fix: trust deploy doctrine / branch mapping as a real signal
- Repo-aware `coach` initially missed untracked files
  - Fix: use `git status --untracked-files=all`
- Direct callers into `buildCoachPacket` lost intent/query unless they came through CLI arg parsing
  - Fix: normalize query text inside `normalizeInput`
- Fresh `adopt --write` polluted routing because generated Temper assistant files looked like infra/security changes
  - Fix: ignore `.temper/**` and `.claude/commands/temper-*.md` in implicit repo-context routing

## Decisions Made

- Keep adoption v1 read-first and explicit
  - `adopt` analyzes, reports, then optionally writes config and assistant files
- Do not mutate repo source-of-truth during adoption
  - only wrap the repo with operating structure first
- Make `ship` run from generated config, not hardcoded UD logic
  - UD should be the first serious adopter, not a special case baked into Temper
- Use architecture overlays for stack-specific guidance
  - browser/typescript monorepo
  - MUD/on-chain live-service

## Exact Next Steps

1. Pick the correct UD worktree for rollout ownership
   - do not install Temper into the dirty main checkout
2. Run read-only adoption there
   - `node /Users/michaelorourke/temper-worktrees/ud-operator/packages/cli/bin/temper.mjs adopt --cwd <ud-worktree>`
3. If the report looks right, install Temper into that UD worktree
   - `node /Users/michaelorourke/temper-worktrees/ud-operator/packages/cli/bin/temper.mjs adopt --cwd <ud-worktree> --write`
4. Review generated `temper.config.json`
   - tighten source-of-truth paths
   - tighten ship hooks
   - decide whether release notes should stay `pnpm changelog:dry` or get a richer UD-specific command
5. Dry-run shipping in UD
   - `ship lite --dry-run`
   - `ship full --dry-run`
6. After confidence, build the next execution surfaces:
   - `hotfix`
   - `review`
   - `verify`
   - then deeper Claude/Codex auto-invocation patterns on top of generated adapters

## Files Touched In This Session

- `packages/cli/src/index.mjs`
  - turned scaffolded commands into real `init`, `adopt`, `assistant`, and `ship`
- `packages/cli/src/lib/coach.mjs`
  - repo-aware routing cleanup and generated-file ignore rules
- `packages/cli/src/lib/project-analysis.mjs`
  - project analysis, family/stack inference, source-of-truth and command inference
- `packages/cli/src/lib/project-config.mjs`
  - config discovery/load/write helpers
- `packages/cli/src/lib/assistant.mjs`
  - generated Claude/Codex helper files
- `packages/cli/src/lib/ship.mjs`
  - configured ship pipeline execution and reporting
- `packages/cli/test/project-ops.test.mjs`
  - end-to-end tests for adopt/install/ship
- `canon/capabilities/init.md`
- `canon/capabilities/adopt.md`
- `canon/architecture/overlays/browser-typescript-monorepo.md`
- `canon/architecture/overlays/mud-onchain-live-service.md`
- `README.md`
- regenerated `derived/**` artifacts

## Non-Obvious Notes

- Temper repo previously had no `SESSION.md`; this handoff creates the first one on this branch
- The main checkout at `/Users/michaelorourke/temper` is still on `main` and does not have this work until branch merge/cherry-pick
- The next session should resume from this worktree, not from the main checkout
- UD `SESSION.md` is stale against live worktree state as of 2026-04-02; fix that before installing Temper into UD

## Deploy / Environment State

- Temper: local only, no deploys
- UD: untouched by this workstream
- No push performed
