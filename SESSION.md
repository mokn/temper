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

Full onboarding flow design + implementation session. Walked paths 1-3 live with Michael.

Key changes shipped (all pushed to feat/assistant-onboarding-flow):
- --experience flag through init path + coach brief tone hint
- Stage collapse: zero concerns → inline recommendation, no permission gate
- Unreliable analysis detection → 2-question flow (new/existing first)
- Full project audit in opening (What I Found: family, lifecycle, git, CI, source-of-truth)
- Persistent advisor voices in generated claude.md + coach brief synthesis instructions
- Search-before-asking when user says existing but doesn't know path
- UD package.json updated to point at feat/assistant-onboarding-flow

## Pending

- Run path 4 (UD): `pnpm exec temper assistant show --cwd ~/ultimate-dominion`
- After path 4: decide if branch is ready to merge to temper#main
- If merging: update UD package.json back to github:mokn/temper#main
- Path 3 recommendation copy still generic — could be more project-specific
