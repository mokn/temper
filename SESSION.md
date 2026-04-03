# Temper Session

Stage: public GitHub alpha, local-first, no hosted control plane yet.

Repo contract:
- main checkout is `~/temper`
- active implementation may happen in worktrees
- private design docs live in `~/Documents/temper/docs/`
- local handoffs stay in ignored `HANDOFF_<slug>.md` files and in `~/Documents/temper/docs/handoffs/`

Last Updated: 2026-04-03

Branch: main (pushed to origin)

## What Just Happened

- Pushed MCP operational tools to origin (6783f91)
- Added `gamify` capability: canon doc, CAPABILITY_REGISTRY, supportsCoach, FILE_HINTS (affc9f5)
- Stopped generating `.claude/commands/temper-*.md` per-project slash commands (35a8ee3) — MCP tools replace them
- Removed `renderClaudeCommand` and `commandSpec` (dead code after slash command removal)
- Updated all tests, 45/45 pass

## Pending

- UD Temper regeneration not pushed (864d7f5b on UD main)
- Delete existing temper slash commands from UD `.claude/commands/`
- Eventual npm publish path
