---
title: Init Capability Canon
doc_type: capability
capability_id: init
status: seeded
reviewed: 2026-04-02
tags:
  - setup
  - scaffolding
  - config
  - assistants
---

# Init

## Purpose

Create a new Temper operating contract for a repo that does not already have one.

## Responsibilities

- choose family and stack
- write `temper.config.json`
- seed assistant surfaces
- create the minimum workflow spine for Temper-aware operation

## Rules

- do not pretend setup is magic
- prefer explicit defaults over hidden inference
- generate files that are easy to edit by hand
- install assistant surfaces without overwriting unrelated user workflow

## Minimum Output

- `temper.config.json`
- `.temper/assistants/README.md`
- assistant-specific guides
- Claude command surfaces when `.claude/commands/` is present or expected

## Key Question

What is the smallest working operating contract that lets this repo start using Temper immediately?
