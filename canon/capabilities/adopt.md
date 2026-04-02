---
title: Adopt Capability Canon
doc_type: capability
capability_id: adopt
status: seeded
reviewed: 2026-04-02
tags:
  - migration
  - existing-project
  - config
  - source-of-truth
---

# Adopt

## Purpose

Bring an existing game repo under Temper discipline without breaking the repo's current source-of-truth surfaces.

## Responsibilities

- analyze structure and workflow surfaces
- infer family and stack
- identify likely source-of-truth paths
- infer operational hooks like build, test, and release-note generation
- generate a migration report
- optionally write the first Temper config and assistant files

## Rules

- default to read-only analysis first
- do not relocate source-of-truth automatically in v1
- prefer staging the operating layer before changing content architecture
- surface uncertainty explicitly when inference is weak

## Migration Stages

1. detect and report
2. write `temper.config.json`
3. install assistant surfaces
4. dry-run `ship lite` until the inferred hooks feel trustworthy
5. tighten config and graduate into real shipping flows

## Key Question

How do we wrap the repo with a safe operating layer before we ask it to change its internals?
