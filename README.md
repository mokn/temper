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
- `temper onboard existing --cwd <repo> --write`
- `temper onboard existing --cwd <repo> --rehearse`
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

## Existing Project Onboarding

`temper onboard existing` is the front door for bringing Temper into an established repo.

It does three things before writing anything:

- maps the project model: family, stack, source-of-truth, environments, workflows, git history
- audits the workflow: local vs beta vs prod posture, operator habits, token-efficiency waste, and trust gaps
- recommends execution policy: which hooks are safe by default, which should stay explicit, and how `ship lite/full` should evolve

With `--write`, it installs:

- `temper.config.json`
- `.temper/reports/onboarding.md`
- `.temper/reports/onboarding.json`
- `.temper/reports/adoption.md`
- Claude/Codex assistant surfaces

With `--rehearse`, Temper replays the full first-run install in a disposable lab instead of touching the source repo. This is the repeatable "fresh install from GitHub" path for tuning the first five minutes of the onboarding experience.
