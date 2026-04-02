---
title: Social Persistent UGC Architecture Canon
doc_type: architecture_family
family_id: social-persistent-ugc
status: seeded
reviewed: 2026-04-02
tags:
  - social
  - persistent
  - ugc
  - creator-tools
  - moderation
  - permissions
  - publishing
sources:
  - https://create.roblox.com/docs/projects/collaboration
  - https://create.roblox.com/docs/production/publishing/publish-experiences-and-places
  - https://create.roblox.com/docs/cloud/open-cloud/usage-place-publishing
---

# Social Persistent UGC Architecture Canon

## What belongs here

Social worlds, creator platforms, persistent shared games, and any product where user
content, permissions, moderation, and publishing workflows are core to the platform.

## Core structural rule

Separate creation, moderation, publication, and live runtime. Treat permissions and
ownership as architecture, not policy text.

## Preferred project structure

- creator-facing content and tooling
- permission and ownership model
- publishing pipeline
- live runtime and persistent data
- moderation and safety systems
- rollback and recovery tooling

## Source-of-truth boundaries

Canonical sources should usually define:

- creator roles and permissions
- publishing targets and version identities
- moderation policies and enforcement hooks
- world or experience metadata
- persistent schema for user-owned content

## Verification model

Verification needs to cover social and operational risk, not only code behavior.

Temper should encourage:

- permission-boundary tests
- publish and rollback rehearsal
- moderation-path verification
- persistent schema migration checks
- creator workflow smoke tests

## Release and hotfix concerns

The publishing surface is itself a product feature. Release mistakes can expose private
content, break creator trust, or corrupt persistent worlds.

Before shipping:

- verify permissions on the target environment
- verify publish target and version identity
- verify rollback path for bad content or broken live state
- verify audit logging for sensitive actions

## Failure modes

- permission models implied in code instead of made explicit
- creators blocked by unclear ownership or publish rules
- persistent state changes with no migration safety
- moderation tools disconnected from the actual runtime
- hotfixes applied to live worlds without auditability

## Team operating notes

This family has the highest operational and safety surface. Infra, security, moderation,
and product ownership all need strong coordination. Multi-session workflows are possible,
but privileged actions should route through narrower capabilities and stricter review.

## Best Temper overlays

- `Kaplan 🎯` for player and creator trust
- `Carmack 🔧` for permissions, rollback, and operational rigor
- `Wright 🌱` for creative leverage and social possibility space
