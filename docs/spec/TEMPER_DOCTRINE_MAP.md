# Temper Doctrine Map

Working doctrine for Michael + Pablo.

Date: 2026-04-02
Status: Example build doctrine, not final public docs

## One Sentence

Temper is an operating system for building and running games properly with AI: structure, safety rails, continuity, and contextual mentorship.

## The Product Stack

Temper should be built as five layers:

1. Canonical doctrine
2. Derived runtime doctrine
3. Capability surface
4. Assistant adapters
5. Project memory and telemetry feedback

If any of those layers are weak, the product feels fake.

## Layer 1: Canonical Doctrine

This must be deep.
If it is not as deep as the Kaplan doc, it is not good enough.

Canonical doctrine should eventually include:

### Hat Canon

- Kaplan
- Miyamoto
- Meier
- Wright
- Carmack

Each should be a real long-form research doc with:

- origin and context
- evolution over time
- major principles
- anti-patterns
- examples and case studies
- regrets, reversals, caveats
- modern relevance
- source notes

These should be peers to [JEFF_KAPLAN_DESIGN_PHILOSOPHY.md](/Users/michaelorourke/Documents/ultimate-dominion/docs/JEFF_KAPLAN_DESIGN_PHILOSOPHY.md), not lightweight prompt files.

### Architecture Canon

Game architecture doctrine should also be deep and family-based:

- deterministic turn-based
- data-driven progression RPG
- real-time wave/systemic
- real-time action
- competitive server-authoritative

Each should answer:

- what the architecture optimizes for
- what the core state model is
- what belongs in data vs runtime code
- what testing/simulation style fits
- what deploy and hotfix risks are common
- how the architecture differs by engine/stack

### Operations Canon

Temper should ship with deep doctrine for:

- source-of-truth data
- environments
- release/versioning
- deploy and rollback
- hotfix discipline
- session continuity
- handoffs
- patch notes
- QA and telemetry

UD already proves this category matters.

### Capability Canon

Each command should eventually have a deep doctrine file:

- ship
- review
- hotfix
- handoff
- verify
- balance
- deploy
- audit
- future
- security
- ux

The command should not just be a syntax wrapper. It should embody a doctrine.

## Layer 2: Derived Runtime Doctrine

The runtime must not load giant raw docs every time.
It should load the right slices.

Each canonical doc should produce three derived layers:

1. Section manifest
2. Retrieval chunks
3. Operational spec

Example:

```text
canon/
  hats/
    kaplan.md
    miyamoto.md
    meier.md
    wright.md
    carmack.md

derived/
  hats/
    kaplan.manifest.yaml
    kaplan.spec.yaml
    kaplan.chunks.jsonl
```

This is how Temper stays cheap, fast, and sharp.

## Layer 3: Capability Surface

This is where the product becomes sticky.

The command surface should not be Claude-specific, even if Claude currently has the best UX.

Temper should define canonical capabilities, then map them into each assistant surface.

### Core Capability Set

#### `ship`

Purpose:
- orchestrated shipping pipeline
- build, review, specialist checks, tests, fix-forward, commit, release prep

What UD already proves:
- this materially improves code quality
- this reduces sloppy shipping
- this is one of the strongest habit-forming surfaces

#### `review`

Purpose:
- findings-only review pipeline
- code quality, security, specialist findings, deduped by severity

#### `hotfix`

Purpose:
- targeted safe response for beta/prod incidents
- blast radius awareness
- rollback planning
- verification before and after the change

This should become one of Temper's strongest game-native commands.

#### `handoff`

Purpose:
- preserve context between sessions
- package branch/worktree/status/next steps

This is not optional. Session continuity is a product feature.

#### `verify`

Purpose:
- source-of-truth parity
- environment sanity
- deploy-state checks
- data drift detection

For games this is more important than generic CI alone.

#### `balance`

Purpose:
- run sims
- compare against thresholds
- trigger hats
- produce player-facing tuning concerns

#### `deploy`

Purpose:
- guided deployment with pre-checks and post-checks
- environment-specific doctrine
- irreversible-step gating

#### `audit`

Purpose:
- broad health sweep
- build, services, git state, data integrity, deploy state, common failure patterns

### Expansion Capability Set

These should exist early as capability concepts even if they start thin:

#### `future`

Purpose:
- architecture durability
- extensibility
- migration path
- "what happens in six months if we keep building this way?"

This command should help the user avoid local optimizations that create structural debt.

#### `security`

Purpose:
- trust boundaries
- access control
- exploit surfaces
- economy abuse
- auth and permissions

For games, this should expand into:

- gameplay exploits
- economy exploits
- griefing vectors
- bot profitability
- rollback and incident containment

#### `ux`

Purpose:
- player flow
- onboarding
- readability
- friction
- feel
- mobile

For games, this should absorb stronger game-native context over time.

## Layer 4: Assistant Adapters

The same capability should exist in every surface, even if syntax differs.

### Claude

Native surface:

- slash commands
- skills
- agent delegation

Example:

- `/ship`
- `/review`
- `/balance`
- `/handoff`

### Codex

Native surface:

- Temper CLI
- local skill/adaptor files
- workflow wrappers and MCP tools

Example:

- `temper ship`
- `temper review`
- `temper handoff`

Or adapter aliases if useful.

### Cursor

Native surface:

- MCP tools
- command palette
- project rules

### Design Principle

The capability is the product.
The syntax is the adapter.

## How Hats Plug Into Commands

The hats should not float around independently.
They should plug into concrete capabilities.

### `ship`

Potential overlays:

- Kaplan for player-facing change risk
- Carmack for release safety
- Miyamoto for feel regressions
- Wright for economy/system effects

### `review`

Potential overlays:

- Carmack for engineering quality
- security doctrine for exploitability
- Kaplan for player cost of a bad decision
- Miyamoto for UX/readability concerns

### `hotfix`

Potential overlays:

- Carmack for blast radius and rollback
- Kaplan for player trust
- Wright for economy/system knock-on effects

### `balance`

Potential overlays:

- Kaplan for fairness
- Meier for decisions and build diversity
- Wright for systemic consequences

### `ux`

Potential overlays:

- Miyamoto for feel and delight
- Kaplan for clarity and player respect

### `future`

Potential overlays:

- Carmack for architecture
- Wright for long-term system behavior
- Meier for whether the system creates meaningful future choice space

## How Game Context Should Compound Over Time

This is one of the most important product ideas.

Generic commands are useful.
Game-aware commands are much better.

The way Temper compounds:

1. generic engineering doctrine
2. game-development doctrine
3. architecture-family doctrine
4. engine/stack doctrine
5. project-specific memory
6. live telemetry and incidents

That means `ship` becomes more game-native over time.

Example:

Generic `ship`:
- build
- review
- tests
- commit

Game-aware `ship`:
- build
- review
- tests
- balance sim
- source-of-truth verification
- environment safety checks
- patch-note generation
- rollback point
- player-facing risk summary

That is a product.

## Recommended Canonical Command Spec

Each command should have a doctrine file like this:

```yaml
name: ship
purpose: orchestrated shipping pipeline
inputs:
  - changed_files
  - diff_summary
  - repo_state
  - environment_state
steps:
  - collect_context
  - run_build
  - spawn_specialists
  - classify_findings
  - fix_or_report
  - reverify
  - commit_prepare
game_overlays:
  - balance
  - economy
  - ux
  - security
hats:
  - kaplan
  - miyamoto
  - wright
  - carmack
stop_conditions:
  - production_deploy_requires_confirmation
  - irreversible_step_requires_confirmation
```

This makes commands portable across assistants.

## Existing Local Evidence

There is already a capability model worth preserving from the current Claude setup:

- [ship skill](/Users/michaelorourke/.claude/skills/ship/SKILL.md)
- [review skill](/Users/michaelorourke/.claude/skills/review/SKILL.md)
- [deploy skill](/Users/michaelorourke/.claude/skills/deploy/SKILL.md)
- [audit skill](/Users/michaelorourke/.claude/skills/audit/SKILL.md)
- [kaplan skill](/Users/michaelorourke/.claude/skills/kaplan/SKILL.md)
- [handoff command](/Users/michaelorourke/ultimate-dominion/.claude/commands/handoff.md)
- [client rules](/Users/michaelorourke/ultimate-dominion/.claude/rules/client.md)
- [game rules](/Users/michaelorourke/ultimate-dominion/.claude/rules/game.md)
- [solidity rules](/Users/michaelorourke/ultimate-dominion/.claude/rules/solidity.md)

The point is not to clone the Claude setup.
The point is to extract the doctrine behind it.

## What Temper Should Eventually Ship

### Canonical Research

- 5 hat docs at Kaplan depth
- architecture family docs at similar depth
- operations doctrine
- command doctrine

### Runtime Layer

- manifests
- chunk files
- operational specs
- retrieval/routing

### Capability Surface

- `temper init`
- `temper doctor`
- `temper ship`
- `temper review`
- `temper hotfix`
- `temper verify`
- `temper balance`
- `temper deploy`
- `temper audit`
- `temper handoff`

### Assistant Adapters

- Claude slash/skills
- Codex skill/CLI wrapper
- Cursor MCP and rule generation

## Recommended Build Order

1. Canonical doctrine for commands and hats
2. Runtime chunking format
3. `ship`, `review`, `handoff`, `verify` as first-class capabilities
4. Hat integration into those commands
5. Architecture-family templates
6. `hotfix`, `balance`, `deploy`, `audit`
7. `future`, `security`, `ux` as stronger overlays

## Hard Rule

Temper should not be a bag of prompts.

It should be:

- deep doctrine
- structured retrieval
- stable capabilities
- assistant adapters
- compounding game context

That is how it becomes a real platform instead of a cool demo.
