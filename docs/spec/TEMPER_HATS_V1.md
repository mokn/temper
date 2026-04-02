# Temper Hats V1

Working doc for Michael + Pablo on the first version of the Temper mentor layer.

Date: 2026-04-02
Status: Example spec, not final product copy

## Core Point

Temper should have two layers:

1. Workflow OS
2. Contextual mentor layer

The workflow OS makes game development safer.
The hats make it feel alive and worth staying with.

## Runtime Model

The hat system should not be "five giant prompts."
It should be:

1. Deep canonical docs on disk
2. A local hierarchical index over those docs
3. Trigger logic that selects the relevant hat and topic slices
4. A cheap model render step for short, friendly, context-aware output
5. A deeper model path when the user wants to go further

This means the product can ship with very deep markdown docs locally and still stay cheap at runtime.

## Answer To The Kaplan Question

Yes, the Kaplan doc should be rearchitected for retrieval.
No, it should not be shortened into a thin prompt.

Keep the deep doc. Add structure on top of it.

Recommended shape for every canonical hat doc:

1. Canonical long-form doc
2. Section manifest
3. Tagged retrieval chunks
4. Operational hat spec

### 1. Canonical Long-Form Doc

This is the deep source file, similar to the existing Jeff Kaplan document:

- origin and context
- evolution over time
- concrete examples
- regrets and reversals
- distilled meta-principles
- source notes

This is for truth and depth, not for direct runtime use on every turn.

### 2. Section Manifest

Each canonical doc should have stable section IDs and machine-usable metadata.

Example:

```yaml
hat: kaplan
version: 1
last_reviewed: 2026-04-02
sections:
  - id: kaplan.quest.clarity
    title: Clarity of action
    tags: [clarity, quests, onboarding, usability]
  - id: kaplan.balance.perception
    title: Perception over reality
    tags: [balance, fairness, player-trust, live-service]
  - id: kaplan.time.respect
    title: Respect player time
    tags: [friction, grind, progression, inventory]
```

### 3. Tagged Retrieval Chunks

Each important section should be chunked into small retrievable units.

Example chunk types:

- principle
- anti-pattern
- case-study
- regret
- caveat
- quote
- trigger-example

Example:

```yaml
chunk_id: kaplan.balance.perception.01
hat: kaplan
kind: principle
tags: [balance, fairness, perception, player-trust]
summary: Perceived unfairness can matter more than mathematically correct balance.
```

### 4. Operational Hat Spec

This is the small runtime doc for the system, not the research layer.

Suggested fields:

```yaml
hat: kaplan
label: "Kaplan"
emoji: "🎯"
primary_domains:
  - balance
  - progression
  - rewards
  - onboarding
questions:
  - "Does this serve the player?"
  - "Is this challenge or just friction?"
  - "Is the smart path also the fun path?"
anti_patterns:
  - grind-gates
  - unclear-required-actions
  - designer-fun-over-player-fun
style:
  tone: warm_direct
  max_sentences: 3
  ask_followup_question: true
```

## Recommended V1 Hats

Keep it to five.

### Kaplan 🎯

Domain:
- fairness
- player trust
- progression
- reward pacing
- readability of action

Core questions:
- Does this serve the player?
- Is this challenge or just friction?
- Is the smart way to play also the fun way?

Strong trigger moments:
- drop-rate changes
- progression item changes
- onboarding changes
- reward schedule changes
- live-service tuning

Modern caveat:
- Kaplan's newer comments suggest older team-first assumptions can overreach. Individual contribution and personal clarity matter more than some older hero-shooter doctrine admitted.

### Miyamoto ✨

Domain:
- feel
- delight
- readability
- surprise
- sensory response
- player adventure over exposition

Core questions:
- Is this fun to do with your hands?
- Does this create delight or just complexity?
- Is the player discovering the game or being told the game?

Strong trigger moments:
- movement/combat feel work
- camera/control changes
- interaction loop changes
- tutorial/onboarding changes
- UI changes that affect feel/readability

Modern caveat:
- Miyamoto is not anti-story. The principle is that story should support the player's own experience, not trap them in exposition.

### Meier ♟️

Domain:
- interesting decisions
- tradeoffs
- player expression
- information quality
- system simplification

Core questions:
- Is this an interesting decision?
- Is it situational, persistent, and understandable?
- Does it support different playstyles?

Strong trigger moments:
- ability design
- upgrade/economy systems
- build choices
- strategy layers
- UI that presents choices

Modern caveat:
- Not every genre is decision-first. Some games center feel, rhythm, or execution. The Meier hat should not be forced into pure action problems.

### Wright 🌱

Domain:
- systems interaction
- emergence
- economies
- simulation
- player stories
- possibility space

Core questions:
- What system interactions does this create?
- Does this increase expressive play or just add rules?
- Will players generate stories from this?

Strong trigger moments:
- economy work
- NPC/system interaction rules
- sandbox features
- simulation logic
- crafting, housing, market, social loops

Modern caveat:
- Emergence without legibility turns into noise. Wright needs a readability constraint from Kaplan and Miyamoto.

### Carmack 🔧

Domain:
- engineering integrity
- robustness
- performance
- abstraction discipline
- operational safety

Core questions:
- Is this simpler than it looks?
- Are we building on clear invariants?
- Will this fail cleanly?

Strong trigger moments:
- deploy and hotfix work
- sync/indexing/state bugs
- architecture changes
- performance-sensitive systems
- infrastructure and tooling

Modern caveat:
- This is not a general design hat. It is the build-quality hat.

## Why Emojis Work

Yes, use them.
But use distinctive scan-friendly symbols, not the same hat icon for everything.

Recommended V1 labels:

- Kaplan 🎯
- Miyamoto ✨
- Meier ♟️
- Wright 🌱
- Carmack 🔧

This keeps "hat" as the product metaphor while making each message instantly scannable.

## What The User Should See

Default feedback should be short.

Example:

```text
Kaplan 🎯: This turns a required upgrade into a luck gate.
Median time to acquire jumps from 18 fights to 74.
Want me to sim deterministic alternatives?
```

```text
Meier ♟️: This is only a real choice if both paths stay viable for at least one full zone.
Right now one branch dominates by level 4.
```

```text
Carmack 🔧: This hotfix path has too many moving parts for prod.
You want verify, rollback, and one write surface.
```

## Trigger Strategy

Temper should always evaluate, but only sometimes speak.

Good auto-surface moments:

- feature decision discussions
- balance/progression edits
- sim result anomalies
- pre-deploy and pre-hotfix
- release/patch-note/versioning moments
- regression or incident review

Bad auto-surface pattern:

- firing on every turn
- repeating the same hat advice
- speaking without evidence

## Cheap Model Packet

The cheap model should receive a small packet, not the whole world.

Suggested packet:

```json
{
  "user_intent": "Should this key item stay as a rare drop?",
  "event_type": "design_decision",
  "hat": "kaplan",
  "hat_spec": "...small runtime spec...",
  "evidence": {
    "diff_summary": "dropRate 0.12 -> 0.03 on progression_item=iron_key",
    "sim_summary": "median unlock 18 fights -> 74 fights",
    "project_context": "key required before zone exit"
  },
  "retrieved_chunks": [
    "kaplan.time.respect",
    "kaplan.quest.clarity",
    "kaplan.balance.perception"
  ]
}
```

Expected response:

- 2-3 sentences
- 1 concern
- 1 suggestion or question

## Deep Mode

When the user asks:

- "go deeper"
- "what would Kaplan really think?"
- "explain why"

Then Temper can pass more chunks or the whole canonical doc for that one hat into a stronger model.

## Initial Research Base

This first pass should anchor each hat in dated, local docs. Suggested starting sources:

### Kaplan 🎯

- Lex Fridman transcript, March 2026
- GameSpot full interview, April 2016
- GDC 2009 quest design material

### Miyamoto ✨

- Nintendo official interviews
- Iwata Asks
- TIME interview
- Guardian 2023 interview

### Meier ♟️

- GDC 2012 "interesting decisions"
- memoir excerpts and interviews

### Wright 🌱

- GDC 2010 systems/perspectives talk
- Wired interviews on toys, simulation, and possibility space

### Carmack 🔧

- Lex Fridman interview
- keynote/interview material on simplicity, robustness, optimization, and abstraction

## Product Thesis

The docs can be deep.
The runtime should be selective.

That is how Temper feels smart without becoming expensive or noisy.

## Source Notes

- Jeff Kaplan transcript: https://lexfridman.com/jeff-kaplan-transcript/
- Jeff Kaplan interview: https://www.gamespot.com/articles/the-story-of-overwatch-the-complete-jeff-kaplan-in/1100-6439202/
- Sid Meier GDC 2012 summary: https://www.gamedeveloper.com/design/gdc-2012-sid-meier-on-how-to-see-games-as-sets-of-interesting-decisions
- Will Wright GDC 2010 summary: https://www.gamedeveloper.com/game-platforms/gdc-will-wright-peels-back-layers-of-entertainment-games
- Nintendo Iwata Asks / interviews:
  - https://www.nintendo.com/en-gb/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Ocarina-of-Time-3D/Vol-5-Mr-Shigeru-Miyamoto/4-The-Enjoyment-of-Turning-2D-to-3D/4-The-Enjoyment-of-Turning-2D-to-3D-224714.html
  - https://time.com/4668908/nintendo-switch-miyamoto-interview/
