---
title: Real-Time Wave Systemic Architecture Canon
doc_type: architecture_family
family_id: real-time-wave-systemic
status: seeded
reviewed: 2026-04-02
tags:
  - tower-defense
  - auto-battler
  - wave
  - spawn
  - pacing
  - economy
  - systemic-pressure
sources:
  - https://unity.com/how-to/architect-game-code-scriptable-objects
  - https://unity.com/resources/create-modular-game-architecture-scriptableobjects-unity-6
---

# Real-Time Wave Systemic Architecture Canon

## What belongs here

Tower defense, auto-battlers, horde modes, survivor-like systems, and other games where
pressure arrives in timed waves and the player manages spatial or economic responses.

## Core structural rule

Separate schedule, spawn, economy, and combat resolution. These systems interact tightly,
but they should not become one monolithic game loop.

## Preferred project structure

- wave schedule and encounter definitions
- spawn and pathing systems
- economy and reward systems
- build/deploy or placement systems
- combat and status resolution
- telemetry and long-run simulation tooling

## Source-of-truth boundaries

Canonical data should usually include:

- wave definitions
- spawn compositions
- reward and economy tables
- unit/tower/loadout definitions
- encounter pacing rules

## Verification model

Unit tests matter, but long-run scenario simulation matters more.

Temper should encourage:

- encounter simulations across many seeds
- economy progression checks
- dominant-strategy detection
- failure-point analysis by wave or pressure band
- regression checks on average run length and first-loss timing

## Release and hotfix concerns

Small value changes can shift the entire difficulty curve. This family needs release
notes that explain pacing impact, not just implementation impact.

Before shipping:

- compare pre/post pacing metrics
- check first-session readability and early failure spikes
- verify economy changes do not trivialize or brick later waves

## Failure modes

- wave content authored with no reusable pacing language
- spawn logic intertwined with rendering or UI
- economies that scale faster than pressure or vice versa
- runaway dominant builds
- late-game unreadability caused by stacked systems with no telemetry

## Team operating notes

Separate content and engine ownership clearly. One contributor can own encounters, one
economy, one combat runtime, one UI, but only if simulations and dashboards expose the
cross-effects between those layers.

## Best Temper overlays

- `Kaplan 🎯` for fairness and early trust
- `Meier ♟️` for build diversity and tradeoffs
- `Wright 🌱` for systemic interaction
- `Miyamoto ✨` for readability under pressure
