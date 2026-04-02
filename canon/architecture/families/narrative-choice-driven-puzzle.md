---
title: Narrative Choice-Driven Puzzle Architecture Canon
doc_type: architecture_family
family_id: narrative-choice-driven-puzzle
status: seeded
reviewed: 2026-04-02
tags:
  - narrative
  - branching
  - puzzle
  - state-flags
  - authored-content
  - comprehension
sources:
  - https://github.com/inkle/ink
  - https://github.com/inkle/inky
---

# Narrative Choice-Driven Puzzle Architecture Canon

## What belongs here

Branching narrative games, dialogue-heavy adventures, story puzzlers, and other games
where authored content, state flags, and comprehension gates are the core experience.

## Core structural rule

Separate narrative data, story state, puzzle logic, and presentation. Writers need
authoring power, but authored content must still live in a testable and reviewable system.

## Preferred project structure

- narrative scripts or graph data
- story-state and flag runtime
- puzzle-state runtime
- tooling for branching inspection
- UI and presentation layer
- content validation and localization tooling

## Source-of-truth boundaries

Canonical sources should usually define:

- dialogue and branching scripts
- story and quest flags
- puzzle definitions and answer logic
- content unlock conditions
- localization-ready source text

## Verification model

This family needs content integrity checks as badly as combat games need balance checks.

Temper should encourage:

- branch reachability checks
- dead-end and orphan-node detection
- state-flag validation
- localization and variable-substitution checks
- walkthrough verification for critical story paths

## Release and hotfix concerns

Narrative bugs damage trust because players cannot always repair them. A broken flag can
cost hours of progress or silently erase the intended emotional payoff.

Before shipping:

- verify critical branches and endings
- verify save compatibility with story-state changes
- verify player-facing notes when old saves may be affected

## Failure modes

- branching logic hidden in scattered code instead of visible script/data
- impossible states caused by ad hoc flags
- puzzle gates that are unclear rather than challenging
- content authors blocked by engineering for every change
- localization and narrative tooling divorced from runtime validation

## Team operating notes

This family needs a clean writer/programmer boundary. Multiple contributors can work in
parallel when scripts, state rules, and presentation are separated cleanly and checked automatically.

## Best Temper overlays

- `Miyamoto ✨` for clarity and player comprehension
- `Kaplan 🎯` for player trust around progression gates
- `Meier ♟️` for choice quality in branching design
