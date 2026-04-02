---
title: Data-Driven Progression RPG Architecture Canon
doc_type: architecture_family
family_id: data-driven-progression-rpg
status: seeded
reviewed: 2026-04-02
tags:
  - rpg
  - roguelite
  - progression
  - data-driven
  - abilities
  - balance
  - simulation
sources:
  - https://unity.com/how-to/architect-game-code-scriptable-objects
  - https://unity.com/resources/create-modular-game-architecture-scriptableobjects-unity-6
  - https://dev.epicgames.com/documentation/unreal-engine/using-gameplay-abilities-in-unreal-engine
  - /Users/michaelorourke/ultimate-dominion
---

# Data-Driven Progression RPG Architecture Canon

## What belongs here

RPGs, roguelites, loot/progression games, and ability-driven games where content volume,
balance tuning, and systemic progression matter more than authored one-off scripts.

## Core structural rule

Separate canonical game data from runtime execution. Data should describe items,
abilities, enemies, formulas, progression curves, and content sets. Runtime systems
should interpret that data predictably.

## Preferred project structure

- canonical content data
- validation and codegen layer where needed
- simulation and balance tooling
- combat/effect runtime
- progression and inventory runtime
- client/presentation layer
- release and item-sync tooling

## Source-of-truth boundaries

Source-of-truth data should usually include:

- items, abilities, enemies, drops, and formulas
- stat curves and progression unlocks
- content gating and environment flags
- tuning knobs meant for live iteration

Do not bury balance doctrine inside ad hoc code branches if it can live in a validated
data surface.

## Verification model

This family needs more than unit tests. It needs doctrine-aware simulation.

Temper should encourage:

- schema validation
- referential integrity checks
- simulation of drops, progression, and combat ranges
- parity checks between data canon and generated/runtime artifacts
- release diffs that explain player-facing impact

## Release and hotfix concerns

This family produces a lot of "small" data changes that can still be economically or
emotionally huge. A one-line drop-rate change can alter trust, pacing, or build viability.

Before shipping:

- identify progression-critical changes
- simulate or verify expected impact
- generate player-facing notes from the real diff
- keep rollback points for content and formulas

## Failure modes

- content data edited in multiple inconsistent places
- opaque formulas nobody can reason about
- ability logic duplicated between client and server
- live tuning with no historical trace
- patch notes that do not reflect the actual data diff

## Team operating notes

This family benefits enormously from strict data ownership and session discipline.
One session can safely own combat formulas, another items, another client surfacing,
but only if the canonical data surfaces and verification steps are explicit.

## Best Temper overlays

- `Kaplan 🎯` for progression trust
- `Meier ♟️` for choice and build quality
- `Wright 🌱` for system interaction and replayability
- `Carmack 🔧` for validation and release safety
