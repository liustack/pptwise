---
"@liustack/pptwise": patch
---

Each deck gets its own workspace folder under `.pptwise/`, named for its path from the project root. Two decks in folders of the same name, such as `game/zh` and `lunar/zh`, used to share `.pptwise/zh/`, so photos one fetched or generated turned up in the other's assets and their renders overwrote each other. They now go to `.pptwise/game-zh/` and `.pptwise/lunar-zh/`. A deck at the project's top level keeps its folder. A deck outside the project, or one whose path has letters other than Latin, adds a short hash of its path. The rendered pptx keeps the deck's own name. If a nested deck already has pinned photos, move its `.pptwise/<name>/assets/` folder to the new name.
