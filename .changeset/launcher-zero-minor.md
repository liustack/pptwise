---
"@liustack/pptwise": patch
---

The skill launchers (`run.sh` and `run.ps1`) no longer treat a different 0.x minor on `PATH` as compatible. A skill pinned to 0.34 used to hand its IR to a 0.35 CLI, which had already dropped components the skill still teaches. On a 0.x pin the launcher now requires the same major and minor with a patch at or above the pin, and falls through to `npx` at its own pin otherwise. From 1.0 on, the same major at or above the pin still counts. Anything that is not a plain `X.Y.Z` version is refused.
