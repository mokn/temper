---
title: Deterministic Turn-Based Architecture Canon
doc_type: architecture_family
family_id: deterministic-turn-based
status: seeded
reviewed: 2026-04-02
tags:
  - board-game
  - card-game
  - tactics
  - deterministic
  - replay
  - turn-order
  - state-machine
sources:
  - https://boardgame.io/
---

# Deterministic Turn-Based Architecture Canon

## What belongs here

Board games, digital card games, tactics games, auto-resolved conflict systems, and
other games where the core state progression happens through discrete validated moves.

## Core structural rule

Treat the game as a state machine with explicit moves, turn order, and phase changes.
If the game cannot be replayed from a sequence of inputs, the architecture is probably
too entangled.

## Preferred project structure

- core rules engine
- state schema and serialization layer
- move validation and reducers
- phase and turn-order system
- client presentation
- AI or simulation harness
- logs, replay, and debugging tools

## Source-of-truth boundaries

The source of truth should usually be:

- state schema
- move definitions
- effect resolution rules
- setup and phase definitions
- card, unit, or board data

Rendering should not own rules. UI convenience caches are allowed, but the authoritative
outcome should come from the rules engine.

## Verification model

This family should be the easiest to test exhaustively.

Temper should encourage:

- deterministic test seeds
- replay from move logs
- snapshotting of state transitions
- simulation against dominant strategies or edge-case loops

## Release and hotfix concerns

Hotfixes are safer when the rules engine is isolated. The biggest risk is not usually
deploy mechanics but invalidating live matches, migrations, or existing saves.

Before shipping:

- verify move legality and resolution
- verify save and replay compatibility
- verify content data changes against balance assumptions

## Failure modes

- hidden state living only in UI or network code
- nondeterminism entering move resolution
- ambiguous timing windows
- incomplete logs that make replays untrustworthy
- content patches that change rules without versioning old matches or saves

## Team operating notes

This family works especially well with multi-session development if the rules engine is
clean and the logs are stable. Multiple contributors can safely work in parallel when
they own different cards, effects, AI, or UI layers, as long as move semantics remain
centralized.

## Best Temper overlays

- `Meier ♟️` for choice quality
- `Kaplan 🎯` for fairness and clarity
- `Carmack 🔧` for determinism and debugging
