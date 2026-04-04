# Temper

Temper helps an assistant understand a game repo fast, recommend the safest next move, and install a local working contract you can inspect and trust.

It is built for two entry points:

**New project** — scaffold the operating contract from scratch:

- ask what the game is called, what kind, how much experience
- initialize the config, session, and assistant surfaces in one command

**Existing project** — inspect, recommend, and install without guessing:

- look through the repo
- recommend the safest onboarding path
- let you rehearse the install in a clean copy if the repo already matters
- write the assistant surfaces and workflow files once you approve it

## Public Alpha

Temper is in an early public alpha.

- GitHub install path first
- local-first and human-readable
- no hosted control plane yet
- no telemetry is implemented in this repo yet
- npm publish is not configured yet

## First Win

For an existing repo, Temper should get you to one clean outcome fast:

- it inspects the repo and tells you what it saw
- it recommends the safest next move instead of making you choose blind
- it can rehearse the install in a clean copy before touching the real repo
- once you approve it, it writes the repo-local surfaces your assistant needs

## Quickstart

Install Temper from GitHub into a target repo:

```bash
pnpm add -D github:mokn/temper#main
```

During active Temper development, `link:` gives you live updates without reinstalling:

```bash
# In your target repo's package.json devDependencies:
"temper": "link:../temper"
# then pnpm install
```

**New project:**

```bash
pnpm exec temper assistant show --cwd .
# Temper asks what the game is, then:
pnpm exec temper init --name "My Game" --family data-driven-progression-rpg --cwd .
```

**Existing project:**

```bash
pnpm exec temper assistant show --cwd .
# Temper inspects the repo and recommends the safest next move.
# For established repos, that usually means rehearsing first:
pnpm exec temper onboard existing --cwd . --rehearse
# Review the rehearsal output, then apply:
pnpm exec temper onboard existing --cwd . --write
```

**Machine-readable output** for assistant integrations:

```bash
pnpm exec temper assistant show --cwd . --json
```

**Day-to-day updates** — when Temper canon changes, regenerate the repo surfaces:

```bash
pnpm exec temper assistant install --cwd .
```

Other package managers:

- `npx temper ...`
- `yarn temper ...`
- `bunx temper ...`

## Core Commands

**Setup**

- `temper assistant show --cwd <repo>`
  Starting point for any repo. Shows the recommended next move for unboarded repos; shows installed surfaces for boarded ones.
- `temper init --cwd <repo> --name <name> --family <type>`
  Initialize a new project from scratch.
- `temper onboard existing --cwd <repo> --rehearse`
  Rehearse onboarding in a disposable copy before touching the real repo.
- `temper onboard existing --cwd <repo> --preview`
  Inspect the install plan without writing files.
- `temper onboard existing --cwd <repo> --write`
  Install Temper into an existing repo.
- `temper onboard existing --cwd <repo> --interview`
  Emit the assistant-facing onboarding conversation plan (for assistant-driven flows).
- `temper assistant install --cwd <repo>`
  Regenerate the installed assistant surfaces from the current Temper canon. Run this after updating Temper.

**Day-to-day**

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

**Removal**

- `temper uninstall --cwd <repo> --preview`
  Preview what Temper would remove.
- `temper uninstall --cwd <repo> --write`
  Remove Temper-owned repo surfaces.

## MCP Server

`packages/mcp` ships a Model Context Protocol server that exposes the onboarding flow as five staged tools:

```bash
node packages/mcp/bin/temper-mcp.mjs
```

The tools follow the same staged pacing as the CLI — the LLM calls each one after the user confirms, not upfront:

| Tool | Maps to |
|---|---|
| `temper_onboard_show` | `assistant show --json` |
| `temper_onboard_findings` | analysis findings |
| `temper_onboard_recommend` | recommendation |
| `temper_onboard_preview` | `onboard existing --preview --json` |
| `temper_onboard_apply` | `onboard existing --write` |

Each tool description carries the pacing instruction so the LLM gates on user acknowledgment before advancing.

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
- MCP tools via `packages/mcp/bin/temper-mcp.mjs`

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
