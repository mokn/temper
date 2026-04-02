# Temper

Temper is a game-development operating system for AI-assisted teams.

This repo is in the first implementation phase:

- doctrine-first
- local-first
- command-surface first
- retrieval-ready

The initial focus is:

1. canonical doctrine storage
2. canonical-to-derived conversion
3. local retrieval for cheap-model synthesis
4. assistant-facing capability surfaces
5. repo adoption and workflow execution

See:

- `docs/spec/TEMPER_FULL_DESIGN.md`
- `docs/spec/TEMPER_DOCTRINE_MAP.md`
- `docs/spec/TEMPER_HATS_V1.md`
- `docs/spec/TEMPER_ARCHITECTURE_FAMILIES.md`

## Current Status

- Kaplan canon imported
- remaining top-five hats expanded into canon
- architecture family canon seeded across eight families
- repo scaffold created
- capability surface scaffolded
- derived-layer tooling scaffolded
- local query/retrieval scaffolded
- `coach` routing packet implemented
- `init` and `adopt` project flows implemented
- repo-aware `ship lite` / `ship full` execution implemented
- assistant adapter file generation implemented

Still to deepen:

- source enrichment and sharper quote validation for Miyamoto, Meier, Wright, and Carmack
- overlay canon for mobile/F2P, live-ops economy, procedural generation, and multiplayer authority
- richer hotfix/review/verify execution
- deeper assistant automation on top of the generated adapter files

## Current Entry Points

- `temper onboard existing --cwd <repo>`
- `temper onboard existing --cwd <repo> --preview`
- `temper onboard existing --cwd <repo> --dry-run`
- `temper onboard existing --cwd <repo> --write`
- `temper onboard existing --cwd <repo> --rehearse`
- `temper uninstall --cwd <repo> --preview`
- `temper uninstall --cwd <repo> --write`
- `temper handoff --cwd <repo> --slug <slug> --summary "<summary>" --next "<next step>"`
- `temper init --existing --cwd <repo>` (alias)
- `temper adopt --cwd <repo>`
- `temper adopt --cwd <repo> --write`
- `temper init --cwd <repo>`
- `temper ship lite --cwd <repo> --intent "<summary>"`
- `temper ship full --cwd <repo> --intent "<summary>"`
- `temper assistant install --cwd <repo>`

## GitHub Install Shape

For a fresh install into another repo, install Temper as a dev dependency from GitHub, then run it through that repo's package manager:

- `pnpm exec temper ...`
- `npx temper ...`
- `yarn temper ...`
- `bunx temper ...`

The generated Claude/Codex assistant files are written against that package-manager invocation, not a machine-local checkout path.

Temper now also writes a shared assistant canon at:

- `.temper/assistants/shared-canon.json`
- `.temper/assistants/shared-canon.md`

Claude and Codex surfaces should parse that same repo-local canon and then adapt it to their own syntax instead of carrying separate duplicated doctrine.

Temper also writes a lightweight continuity spine:

- `SESSION.md`
- `.temper/workflow/continuity.json`
- `.temper/workflow/session.json`
- `.temper/workflow/HANDOFF_TEMPLATE.md`

The token strategy is:

- keep `SESSION.md` short
- put restart detail in `HANDOFF_<slug>.md`
- have Claude and Codex read the same continuity canon before relying on chat history

## Existing Project Onboarding

`temper onboard existing` is the front door for bringing Temper into an established repo.

It does three things before writing anything:

- maps the project model: family, stack, source-of-truth, environments, workflows, git history
- audits the workflow: local vs beta vs prod posture, operator habits, token-efficiency waste, and trust gaps
- recommends execution policy: which hooks are safe by default, which should stay explicit, and how `ship lite/full` should evolve

With `--preview` or `--dry-run`, Temper stays read-only and shows:

- the exact files it would create or update
- the operator habit changes it is trying to introduce
- the manual rollback path if you decide not to keep the install

With `--write`, it installs:

- `temper.config.json`
- `.temper/reports/onboarding.md`
- `.temper/reports/onboarding.json`
- `.temper/reports/adoption.md`
- `.temper/workflow/continuity.json`
- `.temper/workflow/session.json`
- `.temper/workflow/HANDOFF_TEMPLATE.md`
- `SESSION.md` Temper-managed continuity block
- `.temper/assistants/shared-canon.json`
- `.temper/assistants/shared-canon.md`
- Claude/Codex assistant surfaces

Onboarded ship policy now defaults to the blessed local path and keeps live/prod checks explicit:

- `ship lite` and `ship full` run blessed steps by default
- gated beta/live steps must be promoted explicitly with `temper ship <mode> --promote <step>`
- prod-sensitive promoted steps also require `--confirm-prod`

With `--rehearse`, Temper replays the full first-run install in a disposable lab instead of touching the source repo. This is the repeatable "fresh install from GitHub" path for tuning the first five minutes of the onboarding experience.

## Uninstall / Reset

`temper uninstall` previews or removes Temper-owned repo artifacts:

- `temper uninstall --cwd <repo> --preview`
- `temper uninstall --cwd <repo> --write`
- `temper reset ...` works as an alias

It only removes Temper-owned surfaces:

- `temper.config.json`
- `.temper/`
- `.claude/commands/temper-*.md`
- Temper runtime blocks inside `AGENTS.md` / `CLAUDE.md`
- the Temper-managed session block inside `SESSION.md`

## Session Continuity

Use `temper handoff` to create the canonical restart artifact and keep `SESSION.md` current:

- `temper handoff --cwd <repo> --slug economy-pass --summary "Wrapped the balance pass." --next "Run beta smoke."`
- add `--write` to record `HANDOFF_economy-pass.md` and update the Temper-managed `SESSION.md` block

The intended split is:

- `SESSION.md` is the short active board
- `HANDOFF_<slug>.md` is the restart document with enough detail to resume cold
