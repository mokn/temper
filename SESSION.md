# Temper Session

Stage: public GitHub alpha, local-first, no hosted control plane yet.

Repo contract:
- main checkout is `~/temper`
- active implementation may happen in worktrees
- private design docs live in `~/Documents/temper/docs/`
- local handoffs stay in ignored `HANDOFF_<slug>.md` files and in `~/Documents/temper/docs/handoffs/`

Last Updated: 2026-04-03

Branch: feat/assistant-onboarding-flow (worktree: ~/temper-worktrees/ud-operator)

## What Just Happened

Walked path 4 (UD) live with Michael. Full onboarding flow works end-to-end against a real project.

Key changes shipped this session (fe7c37f):
- Designer's read: `buildDesignerRead()` generates a short project-specific compliment surfaced as `## Designer's Read` in `assistant show` output and woven into the suggested opening message
- designer_read field added to `buildAssistantAnalysisFindings` return value
- Fires on family + lifecycle + commit depth + scaffolding signal combinations — silent when no good signal

Design decision: MCP layer should keep staged tools (show → findings → recommend), not collapse to one call. The staged pacing is deliberate UX, not a CLI workaround. MCP difference is only who calls them (LLM vs user running commands).

## Pending

- Fix CI rendering bug: `[object Object]` in human-readable output (JSON is correct; text formatter bug in workflow files section)
- Pre-existing test failures: tests 4-20 (fixture lifecycle misdetection, write path, install path) — not caused this session, need separate investigation
- MCP layer: design + implement staged tool wrappers around existing --json output
- UD install: run `--rehearse` first, review AGENTS.md/CLAUDE.md injection, then `--write`
- Branch merge decision: path 4 complete, designer's read shipped — branch is ready to merge after CI render fix
