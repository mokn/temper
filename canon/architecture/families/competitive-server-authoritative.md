---
title: Competitive Server-Authoritative Architecture Canon
doc_type: architecture_family
family_id: competitive-server-authoritative
status: seeded
reviewed: 2026-04-02
tags:
  - moba
  - hero-shooter
  - pvp
  - authoritative-server
  - replication
  - prediction
  - fairness
sources:
  - https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-quick-reference-in-unreal-engine?application_version=5.6
  - https://dev.epicgames.com/documentation/unreal-engine/using-gameplay-abilities-in-unreal-engine
---

# Competitive Server-Authoritative Architecture Canon

## What belongs here

MOBAs, hero shooters, competitive action games, and any multiplayer game where fairness,
replication, prediction, and authority boundaries define the player experience.

## Core structural rule

Authority must be explicit. Server truth, client prediction, replicated state, player
identity, match state, and ability/effect resolution need clear roles and vocabulary.

## Preferred project structure

- match and rules authority
- replicated game state
- player state and identity
- ability/effect/attribute systems
- client prediction and reconciliation
- anti-cheat and trust boundaries
- observability and live incident tooling

## Source-of-truth boundaries

Canonical sources should define:

- match rules and modes
- hero, ability, and item data
- authoritative effect resolution rules
- ranked or competitive tuning values
- environment and matchmaking flags

The client should never quietly become the authority because a system was easier to ship that way.

## Verification model

Verification must go beyond correctness in isolation.

Temper should encourage:

- replication and authority tests
- prediction mismatch tests
- ability/effect integrity checks
- exploit and trust-boundary review
- live metric checks around latency, disconnects, and match health

## Release and hotfix concerns

This family has unforgiving fairness costs. Bugs are not merely local defects; they can
create competitive illegitimacy, abuse, or public loss of trust.

Before shipping:

- verify server/client role boundaries
- verify ranking or match integrity effects
- route security and infra review where appropriate
- prepare rollback and incident-response notes

## Failure modes

- authority split across too many layers
- prediction that masks server truth too aggressively
- player state stored in the wrong replicated surface
- exploit surfaces created by optimistic clients
- hotfixes that repair one fairness issue while destabilizing match reliability

## Team operating notes

This family needs strict ownership for gameplay authority, backend/infra, and security.
Multiple contributors can work in parallel, but risky changes should converge behind
review gates that understand match integrity, not just code quality.

## Best Temper overlays

- `Kaplan 🎯` for fairness and player trust
- `Carmack 🔧` for authority, latency, and correctness
- `Miyamoto ✨` for readability in combat and onboarding
