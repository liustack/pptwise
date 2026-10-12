---
"@liustack/pptwise": minor
---

The DSH plugin keeps deck previews, theme walls and outlines in the session project's `.pptwise/previews/<id>/` instead of `~/.pptwise/previews/`, and writes nothing in the home folder. A card's id now carries its project, so the card finds its preview from any later session while the project stays where it was. A call without a working directory puts the preview beside an absolute deck path, and refuses with a clear message when it has neither. Cards rendered before this release point at `~/.pptwise/previews/`, which the plugin no longer reads: they show the preview as not found, and the old folder stays untouched for you to keep or delete. The plugin no longer copies `~/.pptpress` or `~/.pptfast` into `~/.pptwise`. A deck whose folder name would be `previews` or `theme-try` now lands in `.pptwise/<name>-deck/`.
