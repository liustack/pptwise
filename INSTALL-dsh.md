# Installing pptwise on DeepSeek Harness (for an AI agent)

You are an AI agent and your user told you to install `pptwise` on DeepSeek
Harness (dsh). They handed you this file rather than `INSTALL.md`, which is how
the harness was decided. Do not try to detect the harness yourself and do not
fall back to the skill-folder procedure: the two live in separate files exactly
so nothing has to be inferred at install time.

On dsh, pptwise is a **native plugin**, not a skill folder. Copying the skill
folder here leaves the user without the plugin card and without the CLI that
ships inside it.

There is nothing to configure to render a PPTX. pptwise renders entirely
locally: no API key, no account, no network calls at render time. Optional
stock-photo search needs the user's own Pexels key. The only prerequisite is
Node 22.19+ (or Bun).

## Step 1: Install the plugin

```sh
npx -y @deepseek-ai/dsh plugin --profile web add @liustack/pptwise@0.32.0
```

The version is named on purpose: dsh installs plugins through pnpm 11, which
holds back anything published in the last 24 hours and silently resolves
`@latest` to an older release. A named version is installed as a deliberate
request. `npm view @liustack/pptwise version` prints the current one.

There is no skill folder to copy and no CLI to install. The plugin package
carries the CLI inside itself.

## Step 2: Restart and confirm the card

Tell the user to restart dsh and look at the plugin list. A card named
**pptwise** means the plugin is live and the deck skill is registered.

The skill it registers opens with a runtime note giving the exact
`node <path>/dist/cli.js` command that stands in for `pptwise` inside dsh. You
need that command for the next step.

## Step 3: Health check

Run `doctor` with the command from the runtime note, in the dsh terminal:

```sh
node <path>/dist/cli.js doctor
```

`doctor` checks the runtime against the version floor, reports the dsh plugin's
version, says which optional capabilities are available, and renders a test
deck end to end. It exits 0 when nothing is actually broken. Read the report
and act on what it says: an error names the thing to fix, a warning is worth
relaying to the user but does not block anything. `--json` prints the same
report machine-readably.

Then run one deck through the file path too, since `doctor`'s self-test renders
in memory:

```sh
cat > /tmp/pptwise-hello.json <<'EOF'
{
  "filename": "hello.pptx",
  "theme": { "id": "brief" },
  "slides": [
    { "type": "cover", "heading": "Hello pptwise", "subheading": "A first deck in ten minutes" },
    { "type": "content", "heading": "Why it works", "components": [
      { "type": "bullets", "items": ["Semantic IR in", "Native DrawingML out", "Every shape stays editable"] } ] },
    { "type": "ending", "heading": "Thanks" }
  ]
}
EOF
node <path>/dist/cli.js validate /tmp/pptwise-hello.json
node <path>/dist/cli.js render /tmp/pptwise-hello.json -o /tmp/pptwise-hello.pptx
```

Expected output, line for line:

```
OK — 3 slides, theme "brief"
wrote /tmp/pptwise-hello.pptx (3 slides, 23783 bytes)
```

The byte count is exact on the current release: rendering is deterministic, so
the same IR produces the same bytes. A nearby number on another release is
fine, a wildly different one is not.

## If it fails

- **`dsh` warns `declares no dsh.bundle`** — the release-age gate installed an
  old version (before 0.17.0 the package had no plugin entry at all). `@latest`
  does not avoid this. Name the version instead
  (`npm view @liustack/pptwise version` prints it), then re-run the install
  command with that version.
- **The plugin card does not appear after a restart** — re-run the install
  command, which is safe to repeat, then restart dsh again.
- **The user turns out not to be on dsh after all** — stop and follow
  [`INSTALL.md`](./INSTALL.md) instead. Do not run both procedures.

## Done

Report the `doctor` result to the user and tell them pptwise is ready. The deck
skill is registered in dsh's skill system, so they can ask for a deck in plain
words from here on.

Uninstalling removes the skill with no residue:

```sh
npx -y @deepseek-ai/dsh plugin --profile web remove @liustack/pptwise
```
