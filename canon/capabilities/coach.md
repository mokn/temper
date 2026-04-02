---
title: Coach Capability Canon
doc_type: capability
capability_id: coach
status: seeded
reviewed: 2026-04-02
tags:
  - routing
  - retrieval
  - hats
  - mentor
  - json
---

# Coach

## Purpose

Route current game-building context to the right hats, doctrine packs, and retrieval chunks
so an assistant can give short, context-dependent feedback cheaply.

## Responsibilities

- inspect user intent and lightweight repo context
- infer the relevant hats, capabilities, and architecture family
- retrieve the smallest doctrine slices that matter
- return a structured packet for assistant rendering

## Doctrine

`coach` is not the final voice.
It is the context engine behind the voice.

The operating rule is:

- deep canon on disk
- small retrieval packet at runtime
- cheap model render by default
- stronger model only when asked

## Key Question

What is the smallest relevant doctrine packet that will make the assistant sound like a seasoned game team right now?
