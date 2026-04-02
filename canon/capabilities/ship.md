---
title: Ship Capability Canon
doc_type: capability
capability_id: ship
status: seeded
reviewed: 2026-04-02
tags:
  - release
  - patch-notes
  - review-routing
  - verification
---

# Ship

## Purpose

Orchestrated shipping pipeline for AI-assisted game teams.

## Goals

- preserve speed without sacrificing quality
- scale review depth to the change risk
- keep release work cheap for narrow changes
- run the full pipeline for player-facing or high-risk work

## Modes

### Ship Lite

Use for:

- narrow code changes
- low-risk local work
- non-player-facing fixes
- isolated feature work

Responsibilities:

- build or typecheck
- targeted review routing
- focused tests
- minimal fix-forward
- cheap verification

### Ship Full

Use for:

- player-facing changes
- infra or deploy changes
- economy changes
- security-sensitive changes
- multi-system work

Responsibilities:

- full review routing
- broader test coverage
- stronger release verification
- patch-note generation
- player-risk summary
- rollback-aware release prep

## Game Overlays

- balance
- UX
- security
- infra
- player-facing patch notes

## Key Question

What is the cheapest safe path to confidence for this change?
