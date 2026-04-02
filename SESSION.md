# Active Work — Temper

## Last Updated: 2026-04-02

## Active Worktrees

| Worktree | Branch | Status |
|----------|--------|--------|
| `ud-operator` | `feat/ud-operator` @ `8943dda` | Clean. `init`, `adopt`, assistant adapters, and executable `ship lite/full` are built. Next step is installing Temper into the chosen UD worktree and tightening the generated config. |

## Next

1. Choose the UD worktree that owns the rollout.
2. Run `temper adopt --cwd <ud-worktree>` and review the report.
3. Run `temper adopt --cwd <ud-worktree> --write`.
4. Tighten `temper.config.json`, then dry-run `ship lite/full`.
