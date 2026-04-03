# Temper

Temper is a repo-local operating system for AI-assisted game teams.

It installs a shared canon, continuity layer, run artifacts, and eval surfaces into an existing repository so Claude, Codex, and human operators are working from the same local contract instead of chat history and ad hoc prompts.

## Public Alpha

Temper is in an early public alpha.

- GitHub install path first
- local-first and human-readable
- no hosted control plane yet
- no telemetry is implemented in this repo yet
- npm publish is not configured yet

## What It Does

- onboards an existing repo with a repo-local Temper contract
- generates shared Claude/Codex assistant surfaces from the same canon
- installs a short `SESSION.md` board plus structured handoff files
- records machine-readable run artifacts under `.temper/runs/`
- evaluates whether a repo can be resumed cold with `temper eval restart`

## Why It Exists

Most agent workflows still depend on prompt state and session memory. Temper pushes the important operating state into the repo itself:

- canon in `.temper/assistants/`
- continuity in `SESSION.md` and `HANDOFF_<slug>.md`
- run history in `.temper/runs/`
- onboarding and policy reports in `.temper/reports/`

That makes the workflow cheaper to resume, easier to inspect, and easier to trust.

## Quickstart

Install Temper from GitHub into a target repo:

```bash
pnpm add -D github:<owner>/temper#<sha>
```

Then from that target repo:

```bash
pnpm exec temper assistant show --cwd . --json
# let the assistant ask whether this is a new or existing project
# for existing repos, choose dry run or apply-here first
# then let the assistant summarize any workflow-impacting findings in plain English
# and apply the chosen path with rehearse/write
pnpm exec temper inspect --cwd .
```

If you are onboarding manually instead of through an assistant chat:

```bash
pnpm exec temper onboard existing --cwd . --preview
pnpm exec temper onboard existing --cwd . --write
```

Other package managers work too:

- `npx temper ...`
- `yarn temper ...`
- `bunx temper ...`

## Core Commands

- `temper onboard existing --cwd <repo> --preview`
  Inspect the exact install plan without writing files.
- `temper onboard existing --cwd <repo> --interview`
  Emit the assistant-facing onboarding conversation plan.
- `temper onboard existing --cwd <repo> --write`
  Install Temper into an existing repo.
- `temper onboard existing --cwd <repo> --rehearse`
  Replay onboarding in a disposable lab.
- `temper assistant show --cwd <repo>`
  If the repo is not onboarded yet, return the assistant onboarding plan for chat. If it is onboarded, show the installed assistant surfaces.
- `temper inspect --cwd <repo>`
  Show the installed canon, continuity, policy, and recent runs.
- `temper session show --cwd <repo>`
  Show the live managed session board.
- `temper session set --cwd <repo> --next "<next step>" --status active --write`
  Update the live session state.
- `temper handoff --cwd <repo> --slug <slug> --summary "<summary>" --next "<next step>" --write`
  Create a cold-restart artifact and update the session board.
- `temper runs ls --cwd <repo>`
  List recorded run artifacts.
- `temper runs show latest --cwd <repo>`
  Inspect a recorded run artifact.
- `temper eval restart --cwd <repo>`
  Check whether the current continuity surfaces are good enough to resume cold.
- `temper uninstall --cwd <repo> --preview`
  Preview what Temper would remove.
- `temper uninstall --cwd <repo> --write`
  Remove Temper-owned repo surfaces.

## Trust Model

Temper is designed to be inspectable and reversible.

- preview and dry-run flows stay read-only
- generated repo surfaces are plain text
- run artifacts are local JSON files
- uninstall removes Temper-owned surfaces
- no telemetry is implemented in this repo yet

## What Temper Writes

On a normal install, Temper writes:

- `temper.config.json`
- `.temper/assistants/shared-canon.json`
- `.temper/assistants/shared-canon.md`
- `.temper/assistants/claude.md`
- `.temper/assistants/codex.md`
- `.temper/reports/onboarding.md`
- `.temper/reports/onboarding.json`
- `.temper/reports/adoption.md`
- `.temper/workflow/continuity.json`
- `.temper/workflow/session.json`
- `.temper/workflow/HANDOFF_TEMPLATE.md`
- `.temper/runs/<run-id>.json`
- a Temper-managed block inside `SESSION.md`
- Claude command surfaces under `.claude/commands/temper-*.md`

## Continuity Model

Temper keeps the active board short and the restart artifact detailed.

- `SESSION.md` is the short active board
- `HANDOFF_<slug>.md` is the detailed restart document
- `.temper/workflow/session.json` is the machine-readable session state

The current restart eval checks:

- whether `SESSION.md` contains the Temper-managed session block
- whether `.temper/workflow/session.json` has an active entry
- whether the active entry points to a real handoff
- whether that handoff contains restart-critical sections and numbered next steps

## Current Limits

- packaged for GitHub install, not npm publish
- no hosted/team layer yet
- restart eval is the only built-in eval today
- review, hotfix, and broader benchmark flows still need deeper runtime work

## Development

Run the test suite:

```bash
pnpm test
```

## License

MIT. See [LICENSE](LICENSE).
