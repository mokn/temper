---
title: MUD / On-Chain Live Service Overlay Canon
doc_type: architecture_overlay
overlay_id: mud-onchain-live-service
status: seeded
reviewed: 2026-04-02
tags:
  - mud
  - onchain
  - live-service
  - deploy
  - authority
sources:
  - https://dev.epicgames.com/documentation/en-us/unreal-engine/game-mode-and-game-state-in-unreal-engine?application_version=5.6
  - /Users/michaelorourke/ultimate-dominion/.claude/rules/deploy.md
  - /Users/michaelorourke/ultimate-dominion/docs/operations/DEPLOY_RUNBOOK.md
  - /Users/michaelorourke/ultimate-dominion
---

# MUD / On-Chain Live Service Overlay

## Why this overlay exists

An on-chain game has harsher truth surfaces than a normal browser game.

The world address, deploy target, access grants, schema compatibility, and replay/indexer health are not secondary concerns. They are the runtime.

## Structural doctrine

Separate clearly:

- canonical content and balance data
- contract or world runtime
- post-deploy and verification scripts
- service surfaces like indexers and relayers
- client projections of on-chain state

## Operational doctrine

This overlay demands:

- explicit environment identity
- explicit world address handling
- no ambiguous bare deploy or sync commands
- rollback-aware hotfix flow
- verification after every authority-surface deploy

## Shipping implications

`ship full` should assume stronger review when changes touch:

- world config
- deploy scripts
- access control
- relayer or indexer services
- source-of-truth content that changes economic or entitlement behavior

`hotfix` should stay brutally narrow.

## Failure modes

- deploying to the wrong world
- schema drift between contracts, indexer, and client
- silent access loss after redeploy
- stale world metadata causing clients to miss seed state
- environment confusion between beta and production

## Best Temper pairings

- `Carmack 🔧` for correctness, deploy identity, and rollback discipline
- `Kaplan 🎯` for player trust whenever balance or progression changes land on-chain
- `Security` and `Infra` capability overlays by default
