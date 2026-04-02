---
title: Hotfix Capability Canon
doc_type: capability
capability_id: hotfix
status: seeded
reviewed: 2026-04-02
tags:
  - prod
  - rollback
  - incident
  - blast-radius
---

# Hotfix

## Purpose

Fast, narrow, rollback-aware repair path for live game incidents.

## Responsibilities

- identify the live failure precisely
- bound blast radius and affected environments
- choose the smallest safe fix
- require the minimum viable verification
- record rollback point and operator notes
- prepare incident and player-facing follow-up if needed

## Doctrine

Hotfix is not "ship but faster."
It is a separate operating mode optimized for damaged trust, damaged revenue, or damaged play.

Good hotfix behavior:

- fix the failing surface, not adjacent ambitions
- keep review narrow but serious
- privilege evidence over confidence
- leave a paper trail for the next operator

## Key Question

What is the smallest fix that safely stops the damage?
