# Temper Session

Stage: public GitHub alpha, local-first, no hosted control plane yet.

Repo contract:
- main checkout is `~/temper`
- active implementation may happen in worktrees
- private design docs live in `~/Documents/temper/docs/`
- local handoffs stay in ignored `HANDOFF_<slug>.md` files and in `~/Documents/temper/docs/handoffs/`

Last Updated: 2026-04-03

Branch: main (ahead 1 of origin/main — not pushed)

## What Just Happened

MCP server extended with 8 day-to-day operational tools (0d88e3b). Wired into both Claude Code and Codex CLI globally.

- `temper_coach` (universal doctrine router with capability param: balance, ux, infra, security, gamify)
- `temper_hotfix` (incident response, pre-scoped to prod)
- `temper_ship` (shipping pipeline, defaults dry_run=true)
- `temper_handoff_preview` / `temper_handoff_apply` (preview/write pattern)
- `temper_session_show` / `temper_session_set` (read/update session board)
- `temper_inspect` (health check)
- New tools shell out to CLI binary (avoids stdout corruption, picks up live code changes)
- Existing 5 onboarding tools preserved as-is (direct import)
- 12 new MCP tests, 45 total tests pass
- Registered in `~/.claude/.mcp.json` (already existed) + `~/.codex/config.toml` (new)

## Pending

- UD Temper regeneration not pushed (864d7f5b on UD main)
- Add `gamify` capability to CLI + write `canon/capabilities/gamify.md` doctrine doc
- Stop generating per-project `.claude/commands/temper-*.md` in `assistant.mjs`
- Delete existing temper slash commands from UD `.claude/commands/`
- Push temper main to origin
- Eventual npm publish path
