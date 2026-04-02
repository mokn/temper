---
title: Browser + TypeScript Monorepo Overlay Canon
doc_type: architecture_overlay
overlay_id: browser-typescript-monorepo
status: seeded
reviewed: 2026-04-02
tags:
  - browser
  - typescript
  - monorepo
  - client
  - packages
sources:
  - https://unity.com/how-to/architect-game-code-scriptable-objects
  - https://docs.godotengine.org/en/stable/getting_started/workflow/project_setup/project_organization.html
  - /Users/michaelorourke/ultimate-dominion
---

# Browser + TypeScript Monorepo Overlay

## Why this overlay exists

Temper needs a stack overlay for web-first games that split client, services, simulation, and content tooling across packages.

This stack is common for:

- browser RPGs
- on-chain or hybrid game clients
- internal admin tools and content tooling sharing one repo

## Structural doctrine

Prefer:

- one package for the player client
- one package for backend or service surfaces
- one package for simulation or contract/runtime logic where applicable
- root scripts that orchestrate cross-package build and verification

Avoid:

- hiding operational truth inside only one package
- making package-local scripts the only documented release path
- spreading canonical content across arbitrary frontend caches

## Source-of-truth implications

For this stack, the repo should make it obvious which paths are:

- canonical game content
- generated code
- client projections of content
- deploy and environment surfaces

Generated projections are expected.
Accidental authoring inside projections is not.

## Shipping implications

`ship lite` can often stay at the root script layer.

`ship full` should usually add:

- client typecheck
- package-specific smoke or simulation passes
- release-note generation from real diff surfaces

## Failure modes

- client data copies drift from canonical content
- package-level scripts diverge from root workflow
- deploy knowledge only exists in one service package
- assistant advice ignores which package actually owns the change

## Best Temper pairings

- `Kaplan 🎯` for player trust and onboarding
- `Carmack 🔧` for build and deploy integrity
- `Miyamoto ✨` for first-session client feel
