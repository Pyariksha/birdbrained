---
name: Git workflow — always create a branch
description: User wants all work done on a feature branch, never commit directly to main
type: feedback
---

Always create a new branch before making changes. Never commit directly to main.

**Why:** User explicitly requested this as their preferred workflow.

**How to apply:** At the start of any coding task, run `git checkout -b <descriptive-branch-name>` before touching any files. Branch name should reflect the work being done (e.g. `feat/anime-image`, `fix/reroll-bug`).
