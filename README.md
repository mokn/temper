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

- `temper adopt --cwd <repo>`
- `temper adopt --cwd <repo> --write`
- `temper init --cwd <repo>`
- `temper ship lite --cwd <repo> --intent "<summary>"`
- `temper ship full --cwd <repo> --intent "<summary>"`
- `temper assistant install --cwd <repo>`
