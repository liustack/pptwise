---
"@liustack/pptwise": patch
---

`pptwise serve` now publishes a rebuild's revision number, outcome, and page together when the rebuild finishes. While a rebuild was still running, `GET /status` and the `X-Pptwise-*` headers used to report the new revision number next to the previous attempt's error, a failure that had not happened. They now keep describing the last finished attempt until the next one settles.
