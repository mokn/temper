---
title: Real-Time Action Architecture Canon
doc_type: architecture_family
family_id: real-time-action
status: seeded
reviewed: 2026-04-02
tags:
  - action
  - platformer
  - combat
  - feel
  - camera
  - input
  - feedback
sources:
  - https://docs.godotengine.org/en/latest/getting_started/step_by_step/nodes_and_scenes.html
  - https://docs.godotengine.org/en/stable/getting_started/workflow/project_setup/project_organization.html
  - https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-quick-reference-in-unreal-engine?application_version=5.6
---

# Real-Time Action Architecture Canon

## What belongs here

Action games, platformers, brawlers, action-adventure, character action, and other games
where moment-to-moment control feel is the center of the product.

## Core structural rule

Protect the feel loop. Input, character state, camera, animation, collision, feedback,
and encounter logic must coordinate closely, but the project should still preserve clear
ownership boundaries so the feel loop can be tuned without destroying the rest of the codebase.

## Preferred project structure

- player controller and state logic
- movement/combat runtime
- camera and targeting systems
- animation and feedback hooks
- encounter scripting or composition
- content data for weapons, moves, and enemies

## Source-of-truth boundaries

Source-of-truth should normally separate:

- player move definitions
- enemy behavior data
- level or encounter data
- camera and feedback tuning values

The main risk is letting feel-critical tuning scatter into many scripts with no clear authority.

## Verification model

This family needs mixed verification:

- logic and state tests where possible
- deterministic combat or collision tests for sensitive systems
- performance profiling on hot paths
- direct play review for first-five-minutes and input readability

## Release and hotfix concerns

Some action bugs are not just bugs, they are trust collapses. Latency spikes, unreadable
hit reactions, camera fights, or collision inconsistencies can make the whole game feel wrong.

Before shipping:

- review onboarding and first combat
- test on target performance tiers
- verify animation and gameplay state stay aligned
- confirm the HUD and VFX support, not obscure, the action

## Failure modes

- camera and control logic fighting each other
- animation-driven logic with hidden gameplay consequences
- unowned tuning values spread everywhere
- frame-time instability in feel-critical scenes
- too much authored scripting around mechanics that should remain systemic

## Team operating notes

This family needs tighter integration between design, engineering, animation, and UI
than slower genres. Parallel work is still possible, but handoffs must describe how a
change affects feel, not just code.

## Best Temper overlays

- `Miyamoto ✨` for feel and clarity
- `Kaplan 🎯` for first-session trust
- `Carmack 🔧` for performance and state correctness
