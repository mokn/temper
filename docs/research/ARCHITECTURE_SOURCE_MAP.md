# Architecture Source Map

Date: 2026-04-02
Purpose: research spine for canonical architecture docs

This file is not the canon.
It is the source map that should inform the canon.

## Rule

Temper should not pretend there is one universal game architecture.

It should combine:

- architecture families
- engine patterns
- deployment and collaboration doctrine
- cross-cutting overlays

## Family Coverage

### Deterministic Turn-Based

Core official source:

- boardgame.io homepage and docs
  - https://boardgame.io/

What it supports well:

- state-first design
- move validation
- phases
- turn order
- logs and time travel
- multiplayer sync

What this family doc should focus on:

- deterministic state transitions
- replay/debugging
- authoritative move rules
- card/board/tactics workflows

Promotion status:

- seeded at `canon/architecture/families/deterministic-turn-based.md`

### Data-Driven Progression RPG

Core official source base:

- Unity ScriptableObject architecture guidance
  - https://unity.com/how-to/architect-game-code-scriptable-objects
  - https://unity.com/resources/create-modular-game-architecture-scriptableobjects-unity-6
- Unreal Gameplay Ability System
  - https://dev.epicgames.com/documentation/pl-pl/unreal-engine/gameplay-ability-system-for-unreal-engine?application_version=5.7

Temper's strongest internal proof:

- UD

What this family doc should focus on:

- data vs runtime boundaries
- formulas and content files
- progression curves
- balance simulation
- live tuning and verification

Promotion status:

- seeded at `canon/architecture/families/data-driven-progression-rpg.md`

### Real-Time Wave/Systemic

Source base:

- Unity modular architecture guidance
  - https://unity.com/how-to/architect-game-code-scriptable-objects

This family still needs better genre-specific source coverage.

What this family doc should focus on:

- waves and spawns
- timing and spatial pressure
- economy loops
- dominant-strategy detection
- long-run pacing

Promotion status:

- seeded at `canon/architecture/families/real-time-wave-systemic.md`

### Real-Time Action

Core official source base:

- Godot nodes and scenes
  - https://docs.godotengine.org/en/latest/getting_started/step_by_step/nodes_and_scenes.html
- Unreal Gameplay Framework
  - https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-quick-reference-in-unreal-engine?application_version=5.6

What this family doc should focus on:

- input and camera architecture
- player embodiment
- encounter and feedback loops
- feel-sensitive runtime boundaries
- performance and latency

Promotion status:

- seeded at `canon/architecture/families/real-time-action.md`

### Competitive Server-Authoritative

Core official source base:

- Unreal Gameplay Framework
  - https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-quick-reference-in-unreal-engine?application_version=5.6
- Unreal Gameplay Ability System
  - https://dev.epicgames.com/documentation/pl-pl/unreal-engine/gameplay-ability-system-for-unreal-engine?application_version=5.7

What this family doc should focus on:

- server authority
- player state and game state
- prediction and reconciliation
- abilities/effects/attributes
- fairness and replication

Promotion status:

- seeded at `canon/architecture/families/competitive-server-authoritative.md`

### Simulation / Management / Sandbox

Current source base:

- mostly generalized engine architecture patterns

This family needs stronger dedicated sources.

What this family doc should focus on:

- jobs and throughput
- persistent economies
- compounding state
- simulation correctness
- long-horizon balance

Promotion status:

- seeded at `canon/architecture/families/simulation-management-sandbox.md`

### Narrative / Choice-Driven / Puzzle

Core official source base:

- ink scripting language and tooling
  - https://github.com/inkle/ink
  - https://github.com/inkle/inky

What this family doc should focus on:

- story graph integrity
- branching logic
- state flags
- authored pacing
- puzzle and comprehension gates
- writer/programmer boundary

Promotion status:

- seeded at `canon/architecture/families/narrative-choice-driven-puzzle.md`

### Social / Persistent / UGC

Core official source base:

- Roblox collaboration and publishing docs
  - https://create.roblox.com/docs/projects/collaboration
  - https://create.roblox.com/docs/production/publishing/publish-experiences-and-places

What this family doc should focus on:

- collaboration and ownership
- creator permissions
- publishing boundaries
- moderation surfaces
- rollback and recovery
- persistent social state

Promotion status:

- seeded at `canon/architecture/families/social-persistent-ugc.md`

## Engine Pattern Coverage

### Unity

Strongest documented pattern:

- modular, data-driven architecture with ScriptableObjects

Implications for Temper:

- data-first content surfaces
- designer-friendly assets
- loose coupling
- events and modular systems

### Godot

Strongest documented pattern:

- scenes and nodes as composition system
- filesystem-aligned organization

Implications for Temper:

- scene-local organization
- composition over monolith scripts
- filesystem discipline

### Unreal

Strongest documented pattern:

- explicit gameplay framework roles
- authority separation
- GAS for abilities/effects/attributes

Implications for Temper:

- respect engine framework instead of fighting it
- use role boundaries explicitly
- treat replication/authority as first-class

### Browser / Custom Runtime

Temper can be most opinionated here because there is less built-in structure.

Implications:

- strong source-of-truth rules
- explicit data/runtime/test/release separation
- strong release and hotfix doctrine

## Cross-Cutting Overlays To Research More

- live-ops economy
- mobile/F2P constraints
- procedural/roguelike generation
- multiplayer authority
- UGC and creator tooling
- physical board/card hybrid rules

## Build Rule

The canonical architecture docs should not just describe genre tropes.
They should explain:

- how the code and data should be organized
- how the team should operate the game
- how verification and release should work
- what failure modes matter for that family

Current status:

- family canon is now seeded for all eight major families
- cross-family operating doctrine is seeded at `canon/architecture/operating-model.md`
- the next research pass should deepen overlays like mobile/F2P, procedural generation, and live-ops economy
