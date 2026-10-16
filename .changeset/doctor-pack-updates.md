---
"@liustack/pptwise": minor
---

`pptwise doctor` now has a Content packs section. With a license configured it makes one catalog request and says how many theme packs `pptwise sync` would install or update, or that the saved key is unknown, revoked, or held while its purchase is reviewed. A server it cannot reach is reported as not checked and never fails the report. `--json` carries the result as `packs`. Without a license it asks no server.
