---
title: Architecture Canon Index
doc_type: index
status: seeded
reviewed: 2026-04-02
tags:
  - architecture
  - operating-model
---

# Architecture Canon

Canonical architecture docs belong here.

Target coverage:

- deterministic turn-based
- data-driven progression RPG
- real-time wave/systemic
- real-time action
- competitive server-authoritative
- simulation/management/sandbox
- narrative/choice-driven/puzzle
- social/persistent/UGC

Cross-cutting overlays:

- multiplayer authority
- procedural generation
- live-ops economy
- mobile/F2P
- UGC and creator tooling

Current seeded structure:

- `operating-model.md`
- `families/deterministic-turn-based.md`
- `families/data-driven-progression-rpg.md`
- `families/real-time-wave-systemic.md`
- `families/real-time-action.md`
- `families/competitive-server-authoritative.md`
- `families/simulation-management-sandbox.md`
- `families/narrative-choice-driven-puzzle.md`
- `families/social-persistent-ugc.md`
- `overlays/browser-typescript-monorepo.md`
- `overlays/mud-onchain-live-service.md`

These docs are the canon the CLI should retrieve from.
The design scaffold in `docs/spec/TEMPER_ARCHITECTURE_FAMILIES.md` remains the product-level overview.

Each architecture doc should answer four questions:

- how the game should be structured
- how the team should operate it
- how it should be verified and shipped
- what failure modes matter most
