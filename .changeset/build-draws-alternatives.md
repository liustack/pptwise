---
"@liustack/pptwise": minor
---

`pptwise build` now shows the deck in other themes. On the first build of a deck bound to a built-in theme, it draws the deck's own cover and one or two of its content pages in up to three other themes from the shortlist for the bound theme's occasions and the deck's narrative strategy, writes them to `.pptwise/<deck>/alternatives/`, and lists them under `alternatives` in the report (theme id, display name, page files, and the time taken). `--alternatives` draws them again and `--no-alternatives` skips them. The report also says where the bound theme came from, as `themeSource`: `builtin`, `file` or `pack`.
