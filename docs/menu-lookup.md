---
summary: 'How page type and content kind resolve through a bound theme menu, with one shared route for validation, capacity, and rendering'
read_when:
  - debugging why a page resolves to a particular face
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

The theme is resolved by the three-level name lookup described in [Themes](./themes.md). Once loaded, its menu is the only source for ordinary page-face resolution.

## Boundary pages

`cover`, `chapter`, and `ending` each map directly to one menu entry. Whether a boundary page can render components is a property of the bound face's declared slots. Validation checks the supplied content against that exact face.

A cover or chapter with an asset background takes the dedicated image-cover route. This is a deterministic image treatment, not a second selection system. Content image faces are still reached through their content kind.

## Content pages

A content page looks up `menu.content[slide.kind]`. If the entry is missing, validation fails and lists every content kind offered by the bound theme. Nothing infers a kind from components.

The entry identifies one face and may supply:

- `params`, checked against parameters declared by that face
- `decor`, which may silence the motif or choose another motif with valid parameters
- `brand: "none"`, which suppresses the shared brand fragment for that page

The face supplies slots, geometry, physical capacity, and internal adaptation to actual content. Authors choose semantic kinds and components, not face coordinates.

## One route, three consumers

Validation, capacity calculation, and rendering all consume the same resolved route record:

| consumer | use |
| --- | --- |
| spec validation | Confirms that the bound menu offers every requested kind. |
| IR validation | Confirms the effective face exists and accepts the page content. |
| capacity | Takes the smaller of pacing's editorial budget and the face's physical body capacity. |
| rendering | Invokes that face with the menu parameters, motif posture, and branding permission. |

This parity is a testable invariant. A new route must not be reimplemented separately in validation and rendering.

## Decoration and branding

A face with structural `suppressMotif: true` cannot receive a motif. On any other face, a menu entry may choose `silent` or another motif. If the entry has no decoration opinion, the theme's ordinary motif is used.

Branding resolves independently. A face with structural `branding: "none"` or an entry with `brand: "none"` suppresses the shared brand fragment. Otherwise the deck-level `full`, `cover-only`, or `minimal` posture applies.

## Theme changes

A color fork preserves the menu byte for byte. It can replace the binding, followed by the normal assemble, validate, audit, and render loop.

If two menus differ, the existing spec is not assumed to fit. Return to theme binding, keep useful source material, and rewrite the affected kinds and page fills around the new menu.
