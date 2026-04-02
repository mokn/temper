# Temper Architecture Families

Working doc for Michael + Pablo on how Temper should think about project structure.

Date: 2026-04-02
Status: Example spec, not final template set

## Core Point

Temper should not claim there is one universal game architecture.

It should provide:

1. A generic core operating model
2. a complete set of architecture families that covers the game landscape
3. genre and business-model overlays on top of those families

This is better than pretending that a board game, roguelike, MOBA, and FPS should all share the same internal structure.

## The Generic Core

Every Temper project should have these surfaces, regardless of genre or engine:

- game definition
- gameplay rules/data
- runtime implementation
- presentation layer
- tests and simulation
- environments
- deploy and hotfix workflow
- release notes and versioning
- AI config, memory, and safety rules

That means the generic Temper spine can stay stable even when the genre changes.

## Generic Project Spine

Example:

```text
my-game/
├── temper.config.json
├── game/
│   ├── data/
│   ├── rules/
│   ├── balance/
│   └── content/
├── runtime/
│   ├── client/
│   ├── server/
│   └── engine/
├── tests/
│   ├── unit/
│   ├── simulation/
│   └── regression/
├── environments/
│   ├── local/
│   ├── dev/
│   └── prod/
├── releases/
│   ├── changelogs/
│   └── rollback-points/
├── .temper/
│   ├── hats/
│   ├── memory/
│   ├── rules/
│   └── sessions/
└── .github/workflows/
```

The family overlays then refine what belongs in `game/data`, `rules`, `balance`, `simulation`, and `runtime`.

The important design rule:

- families define the primary architecture
- overlays define the major modifiers

This is how Temper can cover effectively all modern game shapes without inventing a separate architecture for every subgenre.

## Architecture Family 1: Deterministic Turn-Based

Best for:

- board games
- card games
- tactics
- async multiplayer

Primary shape:

- state machine first
- legal moves first
- phases and turn order explicit
- logs and replay built in
- deterministic simulation required

This aligns with the boardgame.io model: state, moves, phases, turn order, sync, logs.

Example spine:

```text
game/
├── setup/
├── state/
├── moves/
├── phases/
├── win_conditions/
└── ai/
```

Temper priorities:

- move validation
- reproducibility
- replay/debug logs
- simulation harness
- hotfix safety around rules changes

## Architecture Family 2: Data-Driven Progression RPG

Best for:

- RPGs
- roguelites with progression
- dungeon crawlers
- loot-based PvE games

Primary shape:

- entities, stats, items, enemies, zones, progression curves
- data and formulas separated from runtime code
- simulation strongly valuable
- economy and reward pacing are first-class

Example spine:

```text
game/
├── actors/
├── items/
├── abilities/
├── enemies/
├── zones/
├── progression/
├── economy/
└── formulas/
```

Temper priorities:

- balance simulation
- progression validation
- source-of-truth content files
- deploy verification for live tuning
- patch note generation for player-facing tuning changes

UD fits here.

## Architecture Family 3: Real-Time Wave/Systemic

Best for:

- tower defense
- auto battlers
- survival wave games
- systems-heavy PvE sandboxes

Primary shape:

- units, waves, spawns, upgrades, economy loops
- timing and spatial logic matter
- dominant-strategy detection matters

Example spine:

```text
game/
├── units/
├── waves/
├── paths/
├── towers/
├── upgrades/
├── economy/
└── spawn_rules/
```

Temper priorities:

- wave simulation
- dominant build detection
- pacing validation
- progression pressure checks

## Architecture Family 4: Real-Time Action

Best for:

- FPS
- action-adventure
- platformers
- character-action games

Primary shape:

- feel first
- input, camera, movement, combat timing
- content data still matters, but execution quality dominates

Example spine:

```text
runtime/
├── input/
├── movement/
├── combat/
├── camera/
├── encounters/
└── feedback/

game/
├── weapons/
├── enemies/
├── levels/
└── tuning/
```

Temper priorities:

- feel-focused review
- readability and onboarding
- tuning surfaces for weapons/enemies
- performance regression checks

## Architecture Family 5: Competitive Server-Authoritative

Best for:

- MOBA
- hero shooter
- PvP arena
- competitive action games

Primary shape:

- authority boundaries are explicit
- client prediction and reconciliation matter
- abilities, attributes, cooldowns, and effects are central
- fairness and clarity matter more than raw content volume

This aligns well with Unreal's Gameplay Ability System concepts: abilities, tasks, attributes, effects, authority, replication.

Example spine:

```text
game/
├── heroes/
├── abilities/
├── effects/
├── attributes/
├── items/
└── maps/

runtime/
├── netcode/
├── prediction/
├── reconciliation/
└── matchmaking/
```

Temper priorities:

- authority safety
- balance and perception review
- telemetry for match outcomes
- replay/debug tooling

## Architecture Family 6: Simulation / Management / Sandbox

Best for:

- city builders
- colony sims
- factory/logistics games
- life sims
- management strategy games

Primary shape:

- many persistent loops
- resource graphs
- queues, jobs, throughput, and economy
- compounding state over time

Example spine:

```text
game/
├── resources/
├── production/
├── agents/
├── jobs/
├── economy/
├── world_rules/
└── progression/
```

Temper priorities:

- economy visibility
- throughput bottleneck detection
- simulation correctness
- save/load integrity
- long-horizon balance checks

## Architecture Family 7: Narrative / Choice-Driven / Puzzle

Best for:

- visual novels
- interactive fiction
- authored narrative adventures
- puzzle and mystery games

Primary shape:

- content graph integrity
- state flags and unlock conditions
- pacing and revelation order
- player comprehension over raw simulation complexity

Example spine:

```text
game/
├── scenes/
├── dialogue/
├── conditions/
├── inventory/
├── flags/
├── puzzles/
└── endings/
```

Temper priorities:

- state graph validation
- dead-end and contradiction detection
- onboarding and comprehension review
- spoiler-safe patch notes and release notes

## Architecture Family 8: Social / Persistent / UGC

Best for:

- social worlds
- MMO-style community games
- creator platforms
- persistent guild/clan economies

Primary shape:

- identity and permissions
- moderation surfaces
- creator publishing and rollback
- social graph and market graph

Example spine:

```text
game/
├── identities/
├── guilds/
├── permissions/
├── markets/
├── worlds/
├── moderation/
└── creator_content/
```

Temper priorities:

- permissions and abuse resistance
- moderation and recovery tooling
- social economy health
- rollback and incident response

## Cross-Cutting Overlays

These overlays can modify multiple families:

- procedural/roguelike generation
- live-ops economy
- multiplayer authority
- mobile/F2P constraints
- creator/UGC tooling
- physical board/card hybrid rules

Temper should model overlays explicitly rather than hiding them inside the family name.

## Engine Notes

Temper should not fight the native organizing principle of the engine.

### Unity

Unity's official guidance strongly supports modular, data-driven architecture with ScriptableObjects:

- separate data from logic
- reduce hard references between systems
- make systems easier to change and debug
- create event-driven connections where possible

Temper implication:

- Unity templates should lean heavily on data assets, events, and modular components

### Godot

Godot centers composition through nodes and scenes:

- scenes are reusable building blocks
- filesystem and scene structure matter
- composition beats giant monolith scripts

Temper implication:

- Godot templates should map game systems to scenes, nodes, and clean project organization

### Unreal

Unreal has strong built-in framework boundaries:

- GameMode
- GameState
- PlayerController
- Pawn/Character
- Ability System

Temper implication:

- Unreal templates should respect framework separation instead of forcing a custom pseudo-engine architecture on top

### Browser/TypeScript/Custom Engine

This is where Temper can be most opinionated because there is less built-in structure.

Temper implication:

- define the data/runtime/test/release spine clearly
- enforce source-of-truth data
- provide simulation and release workflow by default

## What `temper init` Should Really Do

`temper init` should ask two questions:

1. What family is this game closest to?
2. What stack is it built on?

Example:

```text
Family: Data-driven progression RPG
Stack: Browser + TypeScript
```

That should choose:

- data layout
- simulation harness
- testing defaults
- release workflow
- hat trigger packs
- generated docs and rules

## What `temper init --existing` Should Really Do

It should not promise magic genre extraction for every project immediately.

V1 should:

- detect likely family
- detect likely stack
- identify hard-coded game values
- recommend a migration path
- optionally extract into the Temper spine in stages

Suggested migration stages:

1. detect and report
2. create spine and config
3. move source-of-truth data
4. add verification and release workflow
5. add hats and coaching

## Recommended V1 Family Support

Do not start with all five families equally.

Suggested order:

1. Data-driven progression RPG
2. Deterministic turn-based
3. Real-time action
4. Real-time wave/systemic

Reason:

- RPG is proven by UD
- turn-based is structurally clean
- action gives a feel-heavy contrast
- wave/systemic gives a systems-heavy contrast

The full research canon should still cover all families from the start.
The template and implementation surface can roll out in phases.

## Product Conclusion

Temper should be generic at the operating-system level and opinionated at the family-template level.

That means:

- one core workflow model
- a few architecture families
- genre overlays
- engine-aware templates

Not:

- one "perfect" architecture for every game

## Source Notes

- boardgame.io official site: https://boardgame.io/
- Unity ScriptableObject architecture:
  - https://unity.com/how-to/architect-game-code-scriptable-objects
  - https://unity.com/resources/create-modular-game-architecture-scriptableobjects-unity-6
- Godot nodes and scenes:
  - https://docs.godotengine.org/en/latest/getting_started/step_by_step/nodes_and_scenes.html
  - https://docs.godotengine.org/en/stable/getting_started/workflow/project_setup/project_organization.html
- Unreal framework and abilities:
  - https://dev.epicgames.com/documentation/ru-ru/unreal-engine/gameplay-framework?application_version=4.27
  - https://dev.epicgames.com/documentation/unreal-engine/using-gameplay-abilities-in-unreal-engine
  - https://dev.epicgames.com/documentation/unreal-engine/gameplay-ability-system?application_version=4.27
