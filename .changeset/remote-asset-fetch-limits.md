---
"@liustack/pptwise": patch
---

Remote image assets are now fetched with limits. Only `http` and `https` sources are fetched (a `file:` or other scheme is refused with a reason), a download that takes longer than 30 seconds is abandoned, and a response larger than the 25 MB per-image limit is refused as soon as it says so or crosses the line, instead of after the whole body was read. Relative sources still go to the platform fetch unchanged.
