# Temper Session

Stage: public GitHub alpha, local-first, no hosted control plane yet.

Repo contract:
- main checkout is `~/temper`
- active implementation may happen in worktrees
- private design docs live in `~/Documents/temper/docs/`
- local handoffs stay in ignored `HANDOFF_<slug>.md` files and in `~/Documents/temper/docs/handoffs/`

Current focus:
1. The canonical user path is a plain clone, not a worktree-first setup.
2. Fix Temper ship execution for verbose repos like UD (`spawnSync pnpm ENOBUFS` on `pnpm build`).
3. Improve advanced-mode worktree diagnostics without making worktrees part of the base product story.

Next:
1. Resume from the fresh-clone test shape and rerun `ship lite` after fixing output handling.
2. Re-check `ship full --dry-run` and promoted `smoke` on the plain UD clone.
3. Decide whether to keep/apply Temper to a real UD branch after the ship path is stable.
