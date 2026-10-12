---
summary: 'How page type and content kind resolve through a bound theme menu, where a kind the menu lacks lands, and the one route validation, capacity, and rendering share'
read_when:
  - debugging why a page resolves to a particular face
  - a page drawn as another kind after a theme change
  - touching theme menus, face parameters, or validate and render parity
  - changing image takeovers, capacity checks, decoration, or page branding
---

# Menu lookup

Page resolution is a deterministic table lookup. There is no random choice, seed, weighted tendency, rotation, or author-supplied face identifier.

## Inputs

The project spec binds one theme by name. Boundary pages contribute their `type`. Content pages contribute their required `kind`.

```text
bound theme + page type or content kind -> one menu entry -> one face
```

The theme is resolved by the four-level name lookup described in [Themes](./themes.md). Once loaded, its menu is the only source for ordinary page-face resolution.

## Boundary pages

`cover`, `chapter`, and `ending` each map directly to one menu entry. Whether a boundary page can render components is a property of the bound face's declared slots. Validation checks the supplied content against that exact face.

A cover or chapter with an asset background takes the dedicated image-cover route. This is a deterministic image treatment, not a second selection system. Content image faces are still reached through their content kind.

## Content pages

A content page looks up `menu.content[slide.kind]`. The kind is the author's meaning and never changes. Nothing infers a kind from components.

When the menu does not offer the kind, or offers it on a face that cannot take the page's components, the page lands on the nearest kind that can draw it. One table in `src/render/kind-landing.ts` lists each kind's stand-ins, nearest first:

| kind | stand-ins, nearest first |
| --- | --- |
| points | list |
| list | points |
| comparison | points, list |
| process | points, list |
| data | evidence, points, list |
| photo | evidence, points, list |
| statement | quote, points, list |
| quote | statement, points, list |
| fact | data, statement, points, list |
| evidence | data, photo, points, list |
| hierarchy | points, list |

The lookup tries the kind itself, then its stand-ins as the menu offers them, and takes the first whose face takes every component on the page: each one accepted by a slot, every required slot filled, a full-body component alone or beside the companions the face declares. How many blocks fit is not part of the choice, since density advice and the face's step-aside answer that the same way on any face. A page with no components yet takes the first offered candidate. When no candidate's face takes the page, it stays on the first one and validation says what that face cannot draw. Every built-in menu offers `points` and `list`, so a page always has somewhere to land. Validation fails only when a trimmed custom menu offers none of the candidates.

A landed page is not an error. `spec validate` prints a note, `build` reports it under `drawnAs`, and `inspect` shows the kind it was drawn as. Binding a theme that offers the kind draws the page on that kind's own face again.

The entry identifies one face and may supply:

- `params`, checked against parameters declared by that face
- `decor`, which may silence the motif or choose another motif with valid parameters
- `brand: "none"`, which suppresses the shared brand fragment for that page

The face supplies slots, geometry, physical capacity, and internal adaptation to actual content. Authors choose semantic kinds and components, not face coordinates.

## One route, three consumers

Validation, capacity calculation, and rendering all consume the same resolved route record:

| consumer | use |
| --- | --- |
| spec validation | Confirms that every requested kind, or one of its stand-ins, is offered, and notes each page that lands. |
| IR validation | Confirms the effective face exists and accepts the page content. |
| capacity | Takes the smaller of pacing's editorial budget and the face's physical body capacity. |
| rendering | Invokes that face with the menu parameters, motif posture, and branding permission. |

This parity is a testable invariant. A new route must not be reimplemented separately in validation and rendering.

## Decoration and branding

A face with structural `suppressMotif: true` cannot receive a motif. On any other face, a menu entry may choose `silent` or another motif. If the entry has no decoration opinion, the theme's ordinary motif is used.

Branding resolves independently. A face with structural `branding: "none"` or an entry with `brand: "none"` suppresses the shared brand fragment, footer row included. Otherwise the deck-level `full`, `cover-only`, or `minimal` posture places the logo, and the deck's `footer` decides which footer marks print.

## Theme changes

A color fork preserves the menu byte for byte. It can replace the binding, followed by the normal assemble, validate, audit, and render loop.

Another theme with a different menu is also a name change. Kinds the new menu lacks land as above. Theme furniture that only some faces draw (`kicker`, `stamp`, `tag`, `years`, `stage`) gives way: a face with no place for it leaves it off with a warning, and it stays in the page file for a theme that draws it. `fields` and `ballot` carry content of their own, so a face without a place for them still refuses the page, and the error names the fix. Boundary pages and face-specific fills are checked against the new faces exactly as before.
