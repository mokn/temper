# Temper Session

Stage: public GitHub alpha, local-first, no hosted control plane yet.

Repo contract:
- main checkout is `~/temper`
- active implementation may happen in worktrees
- private design docs live in `~/Documents/temper/docs/`
- local handoffs stay in ignored `HANDOFF_<slug>.md` files and in `~/Documents/temper/docs/handoffs/`

Last Updated: 2026-04-03

Branch: main

## What Just Happened

Enriched the onboarding flow across all paths — coaching, designer's take, experience-awareness, pre-action briefings.

- **Multi-step flow is now default** — `onboard existing` with no flags triggers `renderOnboardingOpening` → `--findings` → `--recommend` instead of dumping a raw report. (50a8b53)
- **Coaching annotations** on all analysis findings — lifecycle, commit history, CI, source-of-truth each get a plain-English explanation of what they mean for the user. (32caccd)
- **Designer's Take** added to init success via `FAMILY_DESIGNER_READ` — family-specific design wisdom. (32caccd)
- **Pre-action briefings** before rehearsal and direct apply — LLM explains what it's about to do before running the command. (32caccd)
- **STOP marker** added to `--recommend` stage — was the only stage without one. (32caccd)
- **Experience flag** threads through all stages via STOP marker next-command lines. (32caccd)
- **Annotated file lists** in rehearsal and `--write` output — each file gets a one-line explanation. (32caccd)
- **Completion moment** after `--write` with first-move coaching keyed to lifecycle. (32caccd)
- **`FAMILY_FIRST_STEPS` wired** into `renderInitSuccess` — concrete first move, not generic. (32caccd)
- **Temper explanation** added to new project and unreliable analysis openings. (32caccd)
- **UD assistant contract updated** with onboarding section in `claude.md`. (28e0cda)
- **All 33 tests green.**

## Pending

- Push these 3 commits to GitHub
- Reinstall UD assistant contract (already done locally, UD needs git add/commit)
- Day-to-day use of Temper in UD — observe, adjust canon or config as needed
- MCP: wire `temper-mcp` into Claude Desktop when ready to test that flow
- Eventual npm publish path (currently `github:mokn/temper#main` or `link:`)
