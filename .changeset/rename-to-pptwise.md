---
"@liustack/pptwise": minor
---

Breaking rename: the product is now pptwise. The package is `@liustack/pptwise`. The CLI is `pptwise`. The skill is `skills/pptwise`. The DSH plugin is `pptwise`. `PPTPRESS_*` and `PPTFAST_*` environment variables remain aliases for `PPTWISE_*`, with the new name winning, then pptpress, then pptfast. If `~/.pptwise` is missing, `~/.pptpress` is copied when present, otherwise `~/.pptfast`. Old directories are left in place. Project config `pptwise.config.json` still reads `pptpress.config.json` and `pptfast.config.json`. Workspace default is `.pptwise`, and a leftover `.pptpress/` or `.pptfast/` is reused when present.
