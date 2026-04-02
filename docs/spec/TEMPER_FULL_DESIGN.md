# Temper Full Design

Date: 2026-04-02
Status: Master design doc before implementation
Audience: Michael + Pablo

## One Line

Temper is a game-development operating system for AI-assisted teams: project structure, session continuity, shipping discipline, hotfix safety, and contextual mentorship through game-design hats.

## What We Are Actually Building

Not:

- a generic AI wrapper
- a game engine
- a prompt library
- a dashboard-first SaaS
- an art-generation product

Yes:

- a workflow OS for building and operating games properly
- a doctrine system that makes assistants game-aware from minute one
- a capability layer that works across Claude, Codex, and Cursor
- a runtime mentorship layer that teaches while the user builds

## The Product Thesis

The sticky part of the product is not "AI for games."

The sticky part is:

1. your AI immediately knows how to build games properly
2. it protects you from structural and operational mistakes
3. it teaches you game design in context
4. it preserves continuity across many sessions and many workstreams

That is what UD already proves.

## The Core Product Layers

Temper should be designed as six layers:

1. Canonical doctrine
2. Derived doctrine for runtime
3. Project operating model
4. Capabilities and commands
5. Assistant adapters
6. Memory and telemetry feedback

If any layer is weak, the whole thing gets mushy.

## Layer 1: Canonical Doctrine

This layer must be deep.
If it is not Kaplan-depth, it is not done.

### 1. Hat Canon

The first five hats:

- Kaplan 🎯
- Miyamoto ✨
- Meier ♟️
- Wright 🌱
- Carmack 🔧

Each canonical hat doc should be a real research artifact with:

- biography and context
- how the person thinks about games
- principles
- anti-patterns
- strong examples
- bad examples
- contradictions and reversals
- modern caveats
- source notes

### 2. Architecture Canon

Deep docs for architecture families and overlays:

- deterministic turn-based
- data-driven progression RPG
- real-time wave/systemic
- real-time action
- competitive server-authoritative
- simulation/management/sandbox
- narrative/choice-driven/puzzle
- social/persistent/UGC worlds

Cross-cutting overlays:

- multiplayer authority model
- procedural/roguelike generation
- live-ops economy
- mobile/F2P constraints
- physical board/card hybrid rules
- creator/UGC tooling

Each must explain:

- state model
- data model
- runtime boundaries
- testing style
- simulation style
- deploy and hotfix failure modes
- engine-specific adaptations

### 3. Operations Canon

Deep docs for:

- source-of-truth data
- environments
- beta/prod discipline
- deploy workflows
- rollback
- hotfixes
- session continuity
- handoffs
- patch notes
- telemetry and incidents

### 4. Capability Canon

Each command needs its own doctrine file:

- init
- adopt
- doctor
- ship
- review
- verify
- hotfix
- deploy
- balance
- handoff
- audit
- security
- infra
- ux
- future

These should be doctrine artifacts, not command blurbs.

## Layer 2: Derived Runtime Doctrine

The runtime should not re-read giant docs blindly.
It should retrieve the right slices.

Every canonical doc should generate:

1. manifest
2. chunk index
3. operational spec

### Canonical Layout

```text
temper/
  canon/
    hats/
      kaplan.md
      miyamoto.md
      meier.md
      wright.md
      carmack.md
    architecture/
      turn-based.md
      progression-rpg.md
      real-time-systemic.md
      real-time-action.md
      server-authoritative.md
      simulation-management-sandbox.md
      narrative-choice-puzzle.md
      social-persistent-ugc.md
    capabilities/
      ship.md
      review.md
      verify.md
      hotfix.md
      security.md
      infra.md
      ux.md
      future.md
```

### Derived Layout

```text
temper/
  derived/
    manifests/
    chunks/
    specs/
```

### Why

This gives you:

- deep local knowledge
- cheap runtime consumption
- sharper responses
- easier model swapping

## Layer 3: Project Operating Model

This is one of the actual products.

Temper should standardize how a game project is operated:

- source-of-truth data
- directory structure
- environments
- worktrees/branches
- ownership and branch isolation
- session state
- multi-session continuity
- multi-person and multi-agent coordination rules
- review and approval requirements
- dirty-state prevention and conflict avoidance
- handoffs
- release workflow
- hotfix workflow
- changelog and patch note generation

### Core Project Spine

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
│   ├── integration/
│   └── regression/
├── environments/
│   ├── local/
│   ├── dev/
│   └── prod/
├── releases/
│   ├── changelogs/
│   ├── patch-notes/
│   └── rollback-points/
├── .temper/
│   ├── memory/
│   ├── sessions/
│   ├── ownership/
│   ├── policies/
│   ├── rules/
│   ├── commands/
│   └── generated/
└── .github/workflows/
```

### Collaboration Model

Temper should assume:

- multiple sessions in flight
- multiple contributors
- multiple assistants
- parallel workstreams
- strict safety requirements around writes, deploys, and hotfixes

That means every project needs explicit operating rules for:

- who owns which worktree/branch
- what counts as read-only vs write-capable work
- when a handoff is mandatory
- when a dirty tree blocks the next step
- which actions require confirmation
- how release and hotfix authority is recorded
- how patch notes and changelogs are generated and approved

This is a feature, not process overhead.

### New Project Path

`temper init`

Creates:

- project spine
- `temper.config.json`
- assistant config
- environment layout
- workflow files
- rules and memory stubs
- commands/capability adapters

### Existing Project Path

`temper adopt`

Purpose:

- analyze existing structure
- infer architecture family
- identify source-of-truth surfaces
- recommend migration stages
- gradually move the project into Temper's operating model

Important:

V1 should not promise magic full extraction.
It should support staged adoption.

## Layer 4: Capabilities And Commands

This is the main user surface.

The syntax can vary by assistant.
The capabilities must stay stable.

These are assistant-facing capabilities.
Claude, Codex, and Cursor sessions should call them through their native adapters.
The CLI is the canonical implementation layer behind them.

### Essential V1 Commands

#### `init`

Create a new Temper project.

Responsibilities:

- pick architecture family
- pick engine/stack
- scaffold project structure
- install assistant config
- seed doctrine and rules

#### `adopt`

Bring an existing project under Temper discipline.

Responsibilities:

- analyze structure
- detect family/stack
- identify hard-coded game values
- identify missing operational surfaces
- generate migration report and optional staged extraction

#### `doctor`

Run a project health and sanity sweep.

Responsibilities:

- repo/worktree sanity
- environment sanity
- source-of-truth sanity
- session continuity sanity
- generated file drift
- release readiness signals

#### `ship`

Orchestrated shipping pipeline.

Responsibilities:

- build/typecheck
- specialist review routing
- tests
- important fix-forward
- reverify
- commit prep
- release note and patch note prep

Game overlays:

- balance check
- player-facing risk summary
- environment safety
- rollback point creation

Modes:

- `ship lite`
  - cheap path for narrow, low-risk changes
  - targeted review routing
  - focused tests only
  - no broad fan-out unless the changed files are risky
  - minimal patch-note generation
- `ship full`
  - full orchestrated pipeline
  - broad specialist routing
  - deeper review
  - stronger release preparation
  - full patch-note and risk summary generation

Rule:

- assistants should default to `ship lite` for scoped local work
- escalate to `ship full` for player-facing, infra, economy, security, deploy, or multi-system changes

#### `review`

Read-only review pipeline.

Responsibilities:

- code quality
- game-quality review
- security review
- severity-ordered findings

#### `verify`

Read-only source-of-truth and environment verification.

Responsibilities:

- deployed state matches intended state
- content parity
- environment drift
- data verification

#### `hotfix`

Game-native incident response workflow.

Responsibilities:

- scope the blast radius
- isolate the write surface
- run targeted checks
- create rollback point
- ship minimal fix
- confirm post-fix stability

#### `deploy`

Guided deployment workflow.

Responsibilities:

- pre-checks
- environment selection
- irreversible-step gating
- post-deploy verification

#### `balance`

Simulation and game-tuning review.

Responsibilities:

- run sims
- compare against thresholds
- trigger hat feedback
- produce recommended interventions

#### `handoff`

Session continuity command.

Responsibilities:

- capture git state
- summarize current work
- record blockers and next steps
- update session surfaces

#### `audit`

Broad system health command.

Responsibilities:

- build status
- environment and service status
- known failure patterns
- data integrity
- incident clues

### Essential V1 Specialist Commands

#### `security`

This needs to be first-class.

Responsibilities:

- auth and access control review
- trust boundaries
- exploit surfaces
- griefing vectors
- economy abuse
- bot profitability
- state manipulation
- attack trees for gameplay and infra

This must become game-aware over time, not stay generic appsec.

#### `infra`

Also first-class.

Responsibilities:

- environments
- deploy plumbing
- background services
- indexers
- relayers
- telemetry pipelines
- rollback and recovery
- secrets and config hygiene

#### `ux`

Responsibilities:

- onboarding
- first-five-minute experience
- first-win / first-understanding path
- readability
- feel
- information hierarchy
- friction
- mobile
- player flow

Important:

- this is not just "make the UI nicer"
- for games, the first five minutes are a retention-critical system
- Kaplan and Miyamoto should both be able to speak here depending on whether the issue is clarity, time-respect, or feel

#### `future`

Responsibilities:

- long-term architecture
- migration path
- extension pressure
- scaling pressure
- "what debt are we buying if we ship this shape?"

## Layer 5: Assistant Adapters

Temper should define capabilities once and adapt them to each surface.

### Claude Adapter

Native feeling surface:

- slash commands
- skills
- agent orchestration

Example:

- `/ship`
- `/review`
- `/hotfix`
- `/balance`
- `/security`
- `/infra`
- `/handoff`

### Codex Adapter

Native feeling surface:

- CLI-first
- local skill wrappers
- MCP or structured command handoff where useful

Example:

- `temper ship`
- `temper review`
- `temper hotfix`
- `temper security`
- `temper infra`

### Cursor Adapter

Native feeling surface:

- MCP tools
- generated rules
- command palette integrations

### Rule

The capability is canonical.
The adapter is presentation.

## Layer 6: Memory And Feedback Loop

Temper should get smarter as it is used.

Not through giant chat logs.
Through structured memory.

### Memory Types

- incidents
- gotchas
- project decisions
- recurring review findings
- release history
- patch-note history
- architecture debt notes

### Telemetry Types

- which commands get used
- which hats fire
- which warnings get ignored
- which issues recur
- where users drop off in flows

This is how the product compounds.

## The Hat System

The hats are not just personalities.
They are contextual mentor overlays.

### V1 Hats

#### Kaplan 🎯

Domains:

- fairness
- progression
- rewards
- clarity of action
- player trust

#### Miyamoto ✨

Domains:

- feel
- delight
- control
- sensory clarity
- adventure over exposition

#### Meier ♟️

Domains:

- interesting decisions
- tradeoffs
- strategy quality
- player expression

#### Wright 🌱

Domains:

- systems interaction
- emergence
- economies
- player stories

#### Carmack 🔧

Domains:

- engineering integrity
- robustness
- performance
- abstraction discipline

### How Hats Fire

Temper should always evaluate.
It should only sometimes speak.

Auto-surface moments:

- feature decision points
- tuning edits
- sim anomalies
- pre-deploy and pre-hotfix
- release and patch-note generation
- regressions and incidents

Default output:

- short
- friendly
- evidence-backed
- one useful point

Deep mode:

- user asks to go further
- stronger model gets more context

## How Capabilities Use Hats

### `ship`

Possible overlays:

- Kaplan for player-facing risk
- Carmack for release discipline
- Wright for system/economy side effects
- Miyamoto for feel regressions

### `review`

Possible overlays:

- Carmack for engineering quality
- Kaplan for player cost of bad design
- Miyamoto for UX clarity

### `hotfix`

Possible overlays:

- Carmack for rollback and blast radius
- Kaplan for player trust
- Wright for economic/system effects

### `balance`

Possible overlays:

- Kaplan for fairness
- Meier for meaningful decisions
- Wright for systemic knock-on effects

### `ux`

Possible overlays:

- Miyamoto for feel
- Kaplan for clarity and time-respect

### `future`

Possible overlays:

- Carmack for architecture
- Wright for system behavior over time
- Meier for future strategic space

## Architecture Families

Temper should be generic in operating model and specific in family templates.

### Family 1: Deterministic Turn-Based

Best for:

- board games
- card games
- tactics

Key shape:

- explicit state
- explicit moves
- phases
- replay and determinism

### Family 2: Data-Driven Progression RPG

Best for:

- RPGs
- dungeon crawlers
- roguelites with progression

Key shape:

- content data separated from logic
- formulas and sim matter
- progression and economy are first-class

UD lives here.

### Family 3: Real-Time Wave/Systemic

Best for:

- tower defense
- auto battlers
- wave/survival games

Key shape:

- units
- spawn/wave logic
- pacing
- dominant strategy detection

### Family 4: Real-Time Action

Best for:

- FPS
- platformers
- action-adventure

Key shape:

- input and feel dominate
- camera/movement/combat loops are central
- tuning surfaces support runtime code

### Family 5: Competitive Server-Authoritative

Best for:

- MOBA
- hero shooter
- PvP arena games

Key shape:

- authority boundaries
- prediction/reconciliation
- abilities/effects/attributes
- fairness and clarity under networked play

### Family 6: Simulation / Management / Sandbox

Best for:

- city builders
- factory/logistics games
- life sims
- strategy sandboxes

Key shape:

- many interacting simulation loops
- economy and throughput visibility
- player planning and automation
- persistence and compounding consequences

### Family 7: Narrative / Choice-Driven / Puzzle

Best for:

- visual novels
- interactive fiction
- narrative adventures
- puzzle games

Key shape:

- progression through authored states
- choice, pacing, revelation, and comprehension
- content graph integrity
- low ambiguity in gating and player understanding

### Family 8: Social / Persistent / UGC

Best for:

- MMO-style worlds
- social sandboxes
- guild and creator ecosystems
- player-authored content platforms

Key shape:

- long-lived identity and community surfaces
- moderation and trust boundaries
- economy and social governance
- creator permissions, publishing, and rollback

### Cross-Cutting Overlays

These overlays can apply to multiple families:

- procedural/roguelike generation
- live-ops economy
- mobile/F2P constraints
- multiplayer authority
- UGC / creator tools
- physical board/card hybrid rules

## Runtime Knowledge Flow

The cheap model should not see everything.
It should see the right packet.

### Runtime Steps

1. detect event
2. classify domain
3. pick capability
4. pick hats
5. retrieve chunks
6. render short response
7. escalate only if needed

### Example Packet

```json
{
  "capability": "ship",
  "event_type": "pre_release",
  "intent": "Ship new economy tuning",
  "hats": ["kaplan", "wright", "carmack"],
  "retrieved_chunks": [
    "kaplan.time.respect",
    "wright.economy.emergence",
    "carmack.operational_safety"
  ],
  "evidence": {
    "changed_files": ["items.json", "shop.json"],
    "sim_summary": "gold supply +24%, rare access -18%",
    "env": "beta"
  }
}
```

## UD Migration Strategy

Temper should not replace UD recklessly.

### Phase 1

Read-only adoption:

- create doctrine docs
- map commands to current workflow
- generate config and project report

### Phase 2

Shadow mode:

- `temper verify`
- `temper doctor`
- `temper handoff`
- `temper review`

No write authority yet.

### Phase 3

Assisted write paths on beta:

- `temper ship`
- `temper balance`
- `temper hotfix` for beta only

### Phase 4

Write parity on selected prod-safe workflows:

- release prep
- patch notes
- handoff
- deploy guidance

### Phase 5

Temper becomes the default operating shell around UD.

## What Ships In V1

### Must Ship

- master doctrine layout
- hat system skeleton
- architecture-family skeleton
- assistant adapters
- `init`
- `adopt`
- `doctor`
- `verify`
- `review`
- `ship`
- `handoff`
- `security`
- `infra`

### Should Ship Early

- `balance`
- `deploy`
- `hotfix`
- `ux`
- `audit`

### Can Wait

- network intelligence
- hosted telemetry APIs
- cross-game benchmarks
- game SDK
- art/music generation

## Hard Requirements

- local-first
- doctrine-heavy
- cheap at runtime
- assistant-agnostic
- game-specific where it matters
- safer than the current ad-hoc workflow

## Build Order

1. Canonical design finalized
2. Canonical doc inventory created
3. Runtime spec and chunking format defined
4. Capability model defined
5. Assistant adapters defined
6. Read-only commands built
7. Write commands built in shadow/beta mode
8. UD migrated gradually

## Final Rule

Temper should feel like:

- an experienced game team
- an operating manual
- a release manager
- a design mentor
- a continuity system

All at once.

If it only feels like "clever prompts," we failed.
