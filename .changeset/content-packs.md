---
"@liustack/pptwise": minor
---

Content packs. `pptwise license set <key>` saves a license key (`license status` and `license clear` check and remove it), and `pptwise packs sync` installs or updates the theme packs that license covers under `$PPTWISE_HOME/packs/`. Every download is checked against the catalog's sha256, its `pack.json`, its engine range, and the theme file checks before it is swapped in whole, so a refused or broken download leaves the installed version in place. Without a license, `packs sync` prints one line and exits 0. `pptwise packs list` shows what is installed.

Theme names now resolve in four levels: the deck directory, workspace `themes/`, installed packs, then the factory presets. A deck binds a pack theme by name like any other, and a workspace file of the same name still wins. `pptwise themes --json` lists pack themes after the presets and marks every row with `"source": "builtin"` or `"source": "pack"`. The skill runs `packs sync` before reading the theme list. See `docs/packs.md`.
