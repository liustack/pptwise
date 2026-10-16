---
"@liustack/pptwise": minor
---

`pptwise brand scan [dir] [--json]` finds what a project already says about its brand: logo files, pictures large enough for a slide, colors and fonts named in style sheets, Tailwind and design-token files and web manifests, and Office templates with their color scheme. It reports the brand color and second color the evidence points to, the `--brand` value for them, and ready `theme try`, `theme fork` and `brand extract` lines. The scan is local and bounded: it never follows a symlink, skips hidden, dependency and build folders, never opens a file named like a secret, and stops at fixed limits it reports.
