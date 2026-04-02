# Temper Session

Stage: local only, public alpha, no hosted control plane yet.

Repo contract:
- main checkout is `~/temper`
- active implementation may happen in worktrees
- private design docs live in `~/Documents/temper/docs/`
- local handoffs stay in ignored `HANDOFF_<slug>.md` files and in `~/Documents/temper/docs/handoffs/`

Current focus:
1. Validate onboarding and install trust in real target repos.
2. Harden continuity and restart quality before telemetry or hosted features.
3. Keep public repo surfaces generic and keep operator scaffolding local.

Next:
1. Run Temper against UD and one non-Temper repo.
2. Tighten packaging and release posture after the install loop is stable.
