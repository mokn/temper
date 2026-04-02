---
title: Deploy Capability Canon
doc_type: capability
capability_id: deploy
status: seeded
reviewed: 2026-04-02
tags:
  - environments
  - beta
  - prod
  - release
---

# Deploy

## Purpose

Move a verified build or content change into a named environment with explicit target awareness.

## Responsibilities

- target environment validation
- environment-specific preflight
- deploy orchestration
- post-deploy checks
- deploy identity recording

## Key Question

What exactly is being promoted, to which environment, with what verification behind it?
