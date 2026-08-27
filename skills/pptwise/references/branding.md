# Branding posture

Read this when extracting a company template, or deciding whether to write `branding: "full"`.

A brand signal answers what the deck should look like, never how it should argue. Turning "this company's palette looks like a consulting firm" into a narrative is a guess wearing a fact's clothes, and it is how a deck ends up arguing in a shape nobody chose.

## Brand themes: the user's own company template

When the user hands over or mentions a `.thmx` theme, `.potx` template, or branded `.pptx`, extract its colors and fonts into a custom theme before choosing the final look. Extraction is local. The file never leaves the machine.

```bash
pptwise brand extract corp-template.pptx -o deck-dir/acme.theme.json --id acme
pptwise preview deck-dir/ --theme-file deck-dir/acme.theme.json --theme acme --html
```

Extraction writes a version 1 partial theme. It contains style and brand tokens, sets `base` to `consulting`, and inherits that base theme's structural faces. Edit the written `base` field before loading only when another built-in structure is intentional. Keep it as a candidate file while comparing looks. In the preview command, `--theme-file` registers the candidate and `--theme acme` selects it without turning it into the project default.

After the user confirms the custom look, save that exact file as `deck-dir/theme.json` and write its id into `deck.spec.json`. The project registers it before assemble and auto-loads it for validate, render, audit, preview, and serve, so every project command stays free of theme flags. `serve` rereads `theme.json` after edits and refreshes the open preview.

```bash
pptwise render deck-dir/
```

`--theme-file` only registers ids. It never selects one. A bare IR file must also use `--theme <id>` or already name that id in `theme.id`:

```bash
pptwise render deck.json --theme-file acme.theme.json --theme acme
```

A deck project with `theme.json` and a spec reference needs neither flag.

Loading enforces a contrast floor. A template whose text and background tones are too close is refused with the failing token and ratio named. Relay that message and ask whether to adjust the extracted colors or use a built-in theme.

Leave `branding` off the spec and the IR unless every content page needs the brand footer. Write `branding: "full"` whenever `meta.confidentiality` is `confidential` or `restricted`, or the file needs an organization colophon. Confidentiality and date then appear on the cover. They stay off every other posture.
