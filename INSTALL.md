# Installing pptwise (for an AI agent)

You are an AI agent and your user told you to install `pptwise`. This document
is the procedure for every harness that reads a **skill folder**: Claude Code,
Codex, Grok CLI, and friends. Follow it in order.

On **DeepSeek Harness (dsh)** pptwise is a native plugin instead, and that
install lives in its own file, [`INSTALL-dsh.md`](./INSTALL-dsh.md). Do not try
to work out which harness you are in: whoever handed you this file already
decided that. If your user says they are on dsh, ask them for that file rather
than guessing your way through this one.

Every step is safe to run again, and every step names what to do when it
fails. Commands are POSIX shell (macOS or Linux). A Windows note follows each
block that needs one.

There is nothing to configure to render a PPTX. pptwise renders entirely
locally: no API key, no account, no engine to set up, no network calls at
render time. Optional stock-photo search (`pptwise images search`) needs the
user's own Pexels key (`pptwise config set pexels.apiKey`). The only
prerequisite is Node 22.19+ (or Bun).

The whole install is three steps:

1. Find the skill directory for your harness.
2. Put the `skills/pptwise` folder into it.
3. Run the health check.

There is no CLI install step. The skill carries its own launcher, which
resolves a runtime on every call (a compatible `pptwise` on `PATH`, then
`npx`, then `bunx`) at a version pinned to the skill itself.

---

## Step 1: Find the skill directory for your harness

A skill is a folder your harness reads at startup. Each harness reads from a
fixed location:

| Harness | Skill directory (`TARGET`) |
| :-- | :-- |
| Claude Code | `~/.claude/skills/` |
| Codex | `~/.codex/skills/` |
| Pi, OpenCode | `~/.agents/skills/` |

Install into this global directory in the user's home, so the skill is
available in every project. Do not install into a project-local skills
directory unless the user explicitly asks to scope it to the current project.

Pick the row for the harness you are running in. If you cannot tell which
harness you are, decide by which config directory already exists:

```bash
ls -d ~/.claude ~/.codex ~/.agents 2>/dev/null
```

- `~/.claude` present -> use `~/.claude/skills/`
- `~/.codex` present -> use `~/.codex/skills/`
- `~/.agents` present -> use `~/.agents/skills/`

Create the directory so the rest of the steps have a target:

```bash
mkdir -p ~/.claude/skills   # replace with the TARGET for your harness
```

**If it fails:** a permission error means you are pointing at a directory you
cannot write. Confirm the path is under the user's home directory
(`echo $HOME`), not a system path.

> **Windows:** `~` is the user profile. The directories are
> `%USERPROFILE%\.claude\skills\`, `%USERPROFILE%\.codex\skills\`, and
> `%USERPROFILE%\.agents\skills\`. Create one with
> `mkdir "$env:USERPROFILE\.claude\skills"` in PowerShell.

---

## Step 2: Put `skills/pptwise` into the skill directory

The skill is the `skills/pptwise` folder in this repository: a `SKILL.md`
(with its Chinese reading mirror `SKILL.zh-CN.md`) and a `scripts/` directory
holding the launcher. Copy the whole folder, launcher included, into `TARGET`:

```bash
rm -rf /tmp/pptwise-src
git clone --depth 1 https://github.com/liustack/pptwise.git /tmp/pptwise-src
mkdir -p ~/.claude/skills/pptwise          # replace with your TARGET
cp -R /tmp/pptwise-src/skills/pptwise/. ~/.claude/skills/pptwise/
```

The copy overwrites an earlier install in place, so running it again just
refreshes the skill. That is also how updating works later: re-run these four
lines, and the launcher's pinned version comes up to date with them.

Confirm the skill and its launcher both landed:

```bash
ls ~/.claude/skills/pptwise/SKILL.md ~/.claude/skills/pptwise/scripts/run.sh
```

**If it fails:**
- `git: command not found` -> install git, or download the repository as a zip
  and copy the same folder out of it by hand.
- The clone cannot reach GitHub -> check network access, then retry.
- `ls` cannot find `SKILL.md` or `scripts/run.sh` -> the copy targeted the
  wrong path. Re-run the `cp` line and check `TARGET`.
- A permission error -> confirm `TARGET` is under the user's home directory
  (`echo $HOME`), not a system path.

> **Windows:** in PowerShell, clone into `"$env:TEMP\pptwise-src"` and replace
> the `cp -R` line with
> `Copy-Item -Recurse -Force "$env:TEMP\pptwise-src\skills\pptwise\*" "$env:USERPROFILE\.claude\skills\pptwise\"`.

### Any other agent

Reference the playbook from the agent's context instead: add one line to the
project's `AGENTS.md` (or equivalent) pointing at
[`skills/pptwise/SKILL.md`](./skills/pptwise/SKILL.md), installed locally or
by its GitHub URL. The skill is plain Markdown and self-contained.

---

## Step 3: Health check

Everything runs through the launcher you just installed. Replace the path with
your own `TARGET` in both commands below.

**1. The built-in check.** One command reports the whole install:

```bash
bash ~/.claude/skills/pptwise/scripts/run.sh doctor
```

On a machine with no `pptwise` installed, this first call may take a few
seconds while `npx` fetches the pinned package. That is how npx works, not a
failure.

`doctor` checks the runtime against the version floor, finds every installed
skill copy on the machine and flags any that is behind, reports the dsh
plugin's version when dsh is present, says which optional capabilities are
available, and renders a test deck end to end. It exits 0 when nothing is
actually broken. Read the report and act on what it says: an error names the
thing to fix, a warning is worth relaying to the user but does not block
anything. `--json` prints the same report machine-readably.

**2. The render loop, on a real file.** `doctor`'s self-test renders in
memory, so run one deck through the file path too:

```bash
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
bash ~/.claude/skills/pptwise/scripts/run.sh validate /tmp/pptwise-hello.json
bash ~/.claude/skills/pptwise/scripts/run.sh render /tmp/pptwise-hello.json -o /tmp/pptwise-hello.pptx
```

Expected output, line for line:

```
OK — 3 slides, theme "brief"
wrote /tmp/pptwise-hello.pptx (3 slides, 23783 bytes)
```

(The byte count is exact on the current release: rendering is deterministic,
the same IR produces the same bytes. A nearby number on another release is
still a pass.)

On dsh, run the same two checks in the dsh terminal, with the packaged-CLI
command from the registered skill's opening note in place of the launcher.
The expected output is identical.

**If it fails:**
- The launcher printed a JSON diagnosis and exited 78 -> no runtime could run
  pptwise: no compatible `pptwise` on `PATH`, no `npx`, and no `bunx`. Read the
  `nextSteps` field in that JSON and relay it. The fix is installing Node
  22.19+ (https://nodejs.org) or Bun (https://bun.sh), then re-running this
  step. Do not report pptwise as broken.
- `doctor` reports the runtime below the version floor -> install Node 22.19+
  (https://nodejs.org) or Bun (https://bun.sh), then re-run.
- `doctor` flags an installed skill copy as stale -> re-run step 2's copy for
  that copy's path. That is the whole update procedure.
- `validate` reports errors -> each one carries a page number and a fix. The
  JSON above is known-good, so an error here means the file was written
  incompletely. Rewrite the heredoc and re-run.
- A warning about the optional `sharp` dependency -> ignore it. It is only
  needed by `pptwise audit --pixels`, never by validate or render.

---

## Done

Installation is complete. From now on the skill triggers on its own when the
user asks for a deck, a PPT, or slides: the model reads the schema, writes IR,
and closes the validate-render loop itself, as laid out in
[`skills/pptwise/SKILL.md`](./skills/pptwise/SKILL.md). The
[README](./README.md) covers the full CLI, themes, deck projects, and the
audit and preview tooling.

---

## Appendix: manual install (rarely needed)

The steps above need no global CLI, and this is not part of them. Install the
CLI globally only when the user wants `pptwise` as their own everyday command
in a terminal:

```bash
npm install -g @liustack/pptwise
pptwise --version
```

The skill's launcher picks up such an install automatically, as long as its
version is at the same major as the pin and no older.

Building from source is for working on pptwise itself, not for using it:

```bash
git clone https://github.com/liustack/pptwise.git
cd pptwise && pnpm install && pnpm build
```
