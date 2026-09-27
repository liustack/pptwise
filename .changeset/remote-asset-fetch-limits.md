---
"@liustack/pptwise": patch
---

Remote image assets are now fetched with limits. Only `http`, `https`, and browser `blob:` sources are fetched, judged by how the URL parses rather than by its raw text (a `file:` or other scheme is refused with a reason), a download that takes longer than 30 seconds is abandoned, and a response larger than the 25 MB per-image limit is refused as soon as it says so or crosses the line, instead of after the whole body was read. Relative sources still go to the platform fetch unchanged. Behind a proxy (`HTTPS_PROXY` and friends) the CLI buffers the response before handing it over, so there only the time limit applies during the download and the size is checked after it.
