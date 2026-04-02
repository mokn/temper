---
title: Game Project Operating Model Canon
doc_type: architecture_operating_model
status: seeded
reviewed: 2026-04-02
tags:
  - operating-model
  - sessions
  - worktrees
  - release
  - hotfix
  - handoff
  - collaboration
  - source-of-truth
sources:
  - /Users/michaelorourke/Documents/ultimate-dominion/docs/TEMPER_FULL_DESIGN.md
  - /Users/michaelorourke/ultimate-dominion/docs/operations/DEPLOY_RUNBOOK.md
  - /Users/michaelorourke/ultimate-dominion/.claude/rules/deploy.md
  - /Users/michaelorourke/ultimate-dominion/SESSION.md
---

# Game Project Operating Model Canon

## Why this doc exists

Temper is not only a content or code organizer. It is an operating model for teams
working with multiple humans, multiple AI sessions, multiple branches, and multiple
environments. The operating model must be stable across genre families.

## Non-negotiable project surfaces

Every Temper project should define:

- source-of-truth content and config paths
- runtime code versus data boundaries
- local, beta, and prod environments
- worktree and branch conventions
- session-state and handoff conventions
- review and specialist-routing rules
- release and hotfix workflows
- changelog and patch-note generation rules

## Source-of-truth doctrine

Source-of-truth boundaries must be explicit. A team should always know where an item,
ability, card, balance rule, encounter, economy curve, or deploy setting ultimately
lives. Generated files can exist, but they should not become accidental authoring
surfaces.

Temper should enforce:

- one canonical authoring surface for each class of game content
- generated artifacts clearly marked and reproducible
- verification commands that catch drift between canon and generated output

## Multi-session and multi-person doctrine

This is first-class, not an edge case.

Temper should assume:

- multiple contributors will edit concurrently
- multiple AI sessions may operate in parallel
- dirty worktrees create real product risk
- handoff quality determines whether context survives

Therefore:

- work happens in named worktrees or branches, not in an ambiguous main checkout
- each workstream has an owner, a scope, and a handoff surface
- `SESSION.md` or equivalent is a living coordination board
- handoffs are canonical artifacts, not optional chat summaries
- command surfaces should be able to refuse dangerous actions if session state is unclear

## Release doctrine

Every project needs a release path with explicit gates:

- verify content integrity
- build and typecheck
- run scoped tests
- route specialist review where required
- prepare release notes and player-facing patch notes
- mark version or deploy identity
- record what changed and where it is live

The exact gates vary by architecture family, but the existence of gates does not.

## Hotfix doctrine

Every project needs a narrower, faster path for production repair that still preserves
blast-radius awareness and rollback thinking.

Temper hotfix flow should always ask:

- what is broken
- who is affected
- what is the narrowest safe fix
- what verification is mandatory before deploy
- what rollback point exists if the fix is wrong

## Capability doctrine

Assistant-facing commands are not marketing sugar. They are operating primitives.
At minimum, the project should understand:

- `doctor`
- `verify`
- `ship lite`
- `ship full`
- `review`
- `handoff`
- `security`
- `infra`
- `deploy`
- `hotfix`
- `ux`
- `future`

The CLI is the canonical implementation. Assistant adapters are presentation layers.

## Failure modes this operating model is designed to prevent

- source-of-truth drift
- orphaned work in hidden sessions
- multiple people editing the same release surface without coordination
- emergency hotfixes with no rollback or evidence
- AI advice detached from repo reality
- patch notes that do not match the shipped change

## Runtime implications

The runtime should always be able to answer:

- what changed
- where the truth lives
- who owns this workstream
- what environment is affected
- what doctrine applies to the decision under discussion
