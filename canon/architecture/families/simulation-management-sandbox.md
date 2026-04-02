---
title: Simulation Management Sandbox Architecture Canon
doc_type: architecture_family
family_id: simulation-management-sandbox
status: seeded
reviewed: 2026-04-02
tags:
  - simulation
  - management
  - sandbox
  - economy
  - throughput
  - jobs
  - long-horizon
sources:
  - https://www.ted.com/speakers/will_wright
  - https://www.gamedeveloper.com/game-platforms/gdc-will-wright-peels-back-layers-of-entertainment-games
  - https://unity.com/en/how-to/how-architect-code-your-project-scales
---

# Simulation Management Sandbox Architecture Canon

## What belongs here

City builders, colony sims, management games, tycoons, and other systems where long-run
state, throughput, economy, and compounding consequences are the main product.

## Core structural rule

Separate simulation state, simulation stepping, player tools, and presentation. The
player may perceive the world as continuous, but the architecture should keep the model
inspectable and debuggable.

## Preferred project structure

- simulation state model
- job or task system
- economy and resource flow systems
- map/world representation
- player tool and build systems
- analytics, replay, and inspection tooling

## Source-of-truth boundaries

Canonical data should usually include:

- building and unit definitions
- production recipes and throughput rules
- economy parameters
- event and scenario definitions
- AI or citizen behavior tuning

## Verification model

This family lives or dies by long-horizon correctness.

Temper should encourage:

- soak tests over long simulated periods
- throughput and bottleneck analysis
- save/load compatibility checks
- inspections for runaway inflation, starvation, or deadlock
- scenario and tutorial verification

## Release and hotfix concerns

The biggest risks are often silent. A broken simulation may look fine for ten minutes
and collapse an hour later. Release review must include long-run verification.

Before shipping:

- run long-horizon scenarios
- inspect save compatibility and migration risk
- verify player tools still expose enough causal information

## Failure modes

- simulation state mixed with presentation state
- unclear causal chains that make debugging impossible
- economies that drift toward degenerate equilibria
- saves that cannot survive balance or schema changes
- creator tools that can produce broken worlds with no validation

## Team operating notes

This family benefits from strong inspection tooling and slow, explicit releases. Parallel
work is safe if the simulation core remains observable and content changes can be replayed.

## Best Temper overlays

- `Wright 🌱` for systems and emergent stories
- `Meier ♟️` for meaningful management choices
- `Carmack 🔧` for long-run correctness and debugging
