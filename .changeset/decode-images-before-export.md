---
"@liustack/pptwise": patch
---

Image assets are now decoded and validated before export. A Node environment without `sharp` installed will fail export with a clear error instead of silently embedding an undecoded buffer.
