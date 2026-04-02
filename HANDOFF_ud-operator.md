# Handoff — Temper Existing-Project Onboarding

## Branch / Worktree

- Worktree: `/Users/michaelorourke/temper-worktrees/ud-operator`
- Branch: `feat/ud-operator`
- Head: `041b540` `feat: add onboarding rehearsal mode`
- Status: clean

## Commits In This Workstream

- `b66f5c3` `feat: add project adoption and ship flows`
- `8943dda` `docs: add init adopt and UD overlay canon`
- `3c724f2` `feat: make assistant hooks portable for github installs`
- `02d71c0` `fix: infer shared workflow context for worktrees`
- `da3aaf0` `feat: add existing-project onboarding flow`
- `041b540` `feat: add onboarding rehearsal mode`

Relevant prior foundation on this branch:

- `c611827` `feat: add repo-aware coached commands`
- `685a490` `feat: add coach doctrine router`
- `0660f00` `feat: deepen hat canon personas`
- `d6f474b` `feat: seed doctrine canon and local retrieval`

## What Was Done

Temper now has a real existing-project onboarding front door instead of only an adoption/write pass.

### Runtime / Product

- Added portable fresh-install behavior for Claude/Codex assistant surfaces
  - root `package.json` exposes a `temper` bin
  - generated assistant files use package-manager invocation like `pnpm exec temper`, `npx temper`, `yarn temper`, `bunx temper`
- Fixed worktree-aware adoption
  - shared workflow state is now discovered from the git common dir / shared checkout
  - active worktrees inherit `AGENTS.md`, `SESSION.md`, handoff docs, and `.claude/rules/*` correctly
- Fixed source-of-truth inference for UD-like repos
  - canonical contract/data surfaces no longer get pushed out by locale noise
- Added existing-project onboarding
  - `temper onboard existing --cwd <repo>`
  - `temper init --existing --cwd <repo>` alias
  - report includes project model, workflow surfaces, lifecycle posture, token-efficiency critique, execution policy classification, recommended hook shape, and workflow recommendations with tradeoffs
- Added repeatable first-run rehearsal
  - `temper onboard existing --cwd <repo> --rehearse`
  - stages a disposable lab, strips prior Temper install state there, and writes the full onboarding contract into that lab
  - this is the repeatable “first five minutes” loop for tuning the GitHub-install experience without touching the source repo

### Files Touched In This Phase

- `package.json`
  - root `temper` bin for dependency installs from GitHub
- `packages/cli/src/index.mjs`
  - wired `onboard existing`, `init --existing`, and `--rehearse`
- `packages/cli/src/lib/assistant.mjs`
  - portable runtime commands, reusable hook block markers, hook cleanup helper
- `packages/cli/src/lib/repo-context.mjs`
  - git common-dir / shared-root detection
- `packages/cli/src/lib/project-analysis.mjs`
  - shared workflow discovery, source-of-truth ranking, env inference improvements
- `packages/cli/src/lib/onboarding.mjs`
  - onboarding analysis/report generation and rehearsal lab materialization
- `packages/cli/test/project-ops.test.mjs`
  - shared-context and portable install coverage
- `packages/cli/test/onboarding.test.mjs`
  - onboarding write path and rehearsal coverage
- `README.md`
  - onboarding and rehearsal docs

## What Was Verified

- `pnpm -C /Users/michaelorourke/temper-worktrees/ud-operator test`
  - passes
- Fresh-install simulation
  - local dependency install into a temp repo worked through `pnpm exec temper`
  - `temper adopt --write` generated portable assistant files
- Real UD read-only analysis
  - `/Users/michaelorourke/ultimate-dominion/.claude/worktrees/pretext-lab`
  - shared workflow state from the main UD checkout is now detected correctly
  - source-of-truth surfaces now resolve to the actual UD canon instead of locale noise
- Rehearsal loop
  - `node /Users/michaelorourke/temper-worktrees/ud-operator/packages/cli/bin/temper.mjs onboard existing --cwd /Users/michaelorourke/temper-worktrees/ud-operator --rehearse --out /tmp/temper-rehearse-selftest`
  - produced a disposable full onboarding install without mutating the source repo

## Product Decisions Made

- Temper should be a project-level install, not a machine-local trick
  - install into the repo
  - infer the operating model
  - write a local contract: `temper.config.json`, reports, assistant surfaces
- Existing-project onboarding is the actual front door
  - `adopt` is still useful, but the bigger product is observe -> critique -> recommend -> write contract -> operate
- The product model is:
  - project model
  - workflow model
  - execution policy
- Low trust is the default for established repos
  - Temper must explain workflow changes, habit changes, tradeoffs, breakage risk, and token-efficiency impact
- The first five minutes matter
  - the sword banner / onboarding presentation is part of the product, not decoration
- `--rehearse` is right for internal iteration now
  - likely future public framing should be `--preview` or `--dry-run`

## What Didn’t Work / Important Corrections

- Bare `temper` commands in generated assistant docs were not portable for a GitHub-installed dependency
  - fix: package-manager runtime commands
- Worktree adoption missed shared repo workflow state
  - fix: inspect git common dir and shared checkout, not just active worktree root
- Source-of-truth truncation dropped real UD canon behind locale files
  - fix: de-prioritize locale noise and stop clipping the list to a tiny prefix
- Existing onboarding had no way to replay the first-run install experience safely
  - fix: disposable rehearsal lab that resets prior Temper state in the lab only

## Current Gaps

This is the real backlog now. Do not resume from the older “install Temper into UD now” plan without addressing at least the policy/trust layer first.

1. Execution policy is advisory, not enforced
   - commands are classified as `safe_local`, `network_readonly`, `live_stateful`, `prod_sensitive`
   - there is no explicit promotion/demotion flow yet
   - `ship lite/full` still comes from recommendations, not a reviewed policy lifecycle
2. History understanding is shallow
   - onboarding reads local git history and workflow files
   - it does not yet synthesize PR history, incidents, handoffs, release patterns, or recurring failure modes into durable project memory
3. Lifecycle inference is still heuristic
   - better evidence is needed for user exposure, economic risk, and operational maturity
4. Recommendations do not resurface over time
   - onboarding gives advice once
   - Temper does not yet coach the repo later on drift, token waste, or unsafe habits
5. Token accounting is directional, not grounded
   - report is useful, but not yet a strong measurable before/after model
6. Public trust path needs better framing
   - likely rename `--rehearse` to `--preview` or `--dry-run`
   - add “what will change / what habits change / rollback” summary before write
7. No uninstall/reset flow yet
8. Need a real post-push GitHub smoke test once the repo is on GitHub

## UD-Specific Risk Still Open

- UD’s dangerous commands are correctly identified, but Temper still does not enforce a hardened blessed contract for UD
- `ship full` should not casually include live-stateful smoke just because the script exists
- this must move from “recommendation in onboarding” to explicit execution policy

## Exact Next Steps

1. Productize the trust path
   - keep `--rehearse` for internal use
   - add a user-facing `--preview` / `--dry-run` equivalent with plain-language output
2. Build explicit execution-policy lifecycle
   - discovered commands
   - recommended hooks
   - blessed hooks
   - gated hooks requiring explicit confirmation or promotion
3. Deepen onboarding memory
   - synthesize git history, handoffs, workflow evolution, incidents, and release patterns into durable local project memory
4. Add progressive resurfacing
   - have Temper keep coaching over time on token waste, workflow drift, and risky habits
5. Add uninstall/reset and “what changes” summaries
6. After the trust layer is stronger, run the full onboarding against the chosen UD worktree and tune the generated contract from the real report
7. Once the repo is on GitHub, do a true GitHub dependency install smoke test instead of only local-path simulation

## Exact Restart Point

Resume in `/Users/michaelorourke/temper-worktrees/ud-operator` on `feat/ud-operator` at `041b540`.

The first task is not “install into UD.” The first task is to harden onboarding trust:

- turn rehearsal into a clearer preview story
- add explicit execution-policy promotion/gating
- deepen history/workflow memory
- make recommendations resurface over time

After that, apply the stronger onboarding flow to the chosen UD worktree.

## Non-Obvious Notes

- Main checkout `/Users/michaelorourke/temper` is still on `main` at `c611827`
- All work above exists only in the `ud-operator` worktree/branch until push/merge
- `SESSION.md` has now been updated to reflect the trust-layer backlog instead of the earlier UD install plan
- No push performed

## Deploy / Environment State

- Temper: local only, no deploys
- GitHub: not pushed yet
- UD: still untouched by this workstream
