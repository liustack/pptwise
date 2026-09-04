---
"@liustack/pptwise": minor
---

Nine themes are renamed, and four keep their id but lose a label that named a customer. A theme name says how a deck speaks, never who it is for, so `consulting` is now `brief` (Brief), `academic` is `thesis` (Thesis), `insight` is `ledger` (Ledger), `tech` is `terminal` (Terminal), `enterprise` is `bulletin` (Bulletin), `classroom` is `homeroom` (Homeroom), `campaign` is `rally` (Rally), `pulse` is `clinic` (Clinic), and `terra` is `almanac` (Almanac). `crayon`, `arena`, `ember` and `runway` keep their ids and are now labelled Crayon, Arena, Ember and Runway instead of Kids Education, Esports & Entertainment, Startup Pitch and Fashion Runway. The industry words move to where they belong: the occasions table still says business, education, finance, tech, health and sustainability, and every theme's positioning and audience still name the rooms it suits.

A theme id is a public interface, so nothing is aliased. The nine old ids are errors, and each error names the id it became — at IR validation, at spec validation, at CLI theme resolution and at preset copy — so a deck moves over in one edit. No page changes: every rendered page in the review gallery is byte-identical to what its old id drew.
