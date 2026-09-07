---
"@liustack/pptwise": patch
---

`pptwise serve` watches directories instead of files, so atomic saves (write-tmp-then-rename) and directories created after startup are detected. `GET /status` returns the build state as JSON, and `GET /` carries `X-Pptwise-Build-Status`, `X-Pptwise-Served-Revision`, and `X-Pptwise-Latest-Revision` headers.
