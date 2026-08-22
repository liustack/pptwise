---
"@liustack/pptpress": minor
---

Rename the product from pptfast to pptpress. The package is `@liustack/pptpress`, the CLI is `pptpress`, the skill is `skills/pptpress`, and the DSH plugin is `pptpress`. `PPTFAST_*` environment variables remain aliases for `PPTPRESS_*`. If `~/.pptpress` is missing and `~/.pptfast` exists, the old directory is copied to the new one and left in place. Project config `pptpress.config.json` still reads `pptfast.config.json`. Workspace default is `.pptpress`, and a leftover `.pptfast/` is reused when present.
