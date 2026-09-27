---
summary: 'Release flow: changesets decide the version, `pnpm release` runs the guards and pushes the tag, CI publishes with provenance and cuts the GitHub Release, main follows npm'
read_when:
  - preparing an npm release
  - a release run failed, or npm and main disagree about the version
  - a version-mismatch guard test fails
  - wondering why there is a .changeset directory
---

# Releasing

Versioning uses [changesets](https://github.com/changesets/changesets) in
local mode: the version is decided by the pending changesets and bumped on a
machine, not by a CI bot. Publishing happens in one place only, the Release
workflow, from a pushed tag. The version's single source of truth is
`package.json`. `src/version.ts` mirrors it, pinned by
`src/version-sync.test.ts`, so a missed sync fails `pnpm check`.

## During development

Any wave that ships user-visible change should leave a changeset behind:

```bash
npx changeset        # pick the bump level, write a human-readable summary
```

This creates a markdown file under `.changeset/` that travels with the branch.
Multiple changesets accumulate. `changeset version` later collapses them into
one correct bump (two minors do not become two bumps).

## Cutting a release

On an up-to-date `main` with the changesets merged:

```bash
pnpm release --dry-run   # every check, nothing changed
pnpm release
```

`scripts/release.mts` does the whole release in this order, and stops with the
reason at the first thing that is not right:

1. **Refuses before anything happens:** a dirty tree, a branch other than
   `main`, a `main` behind or diverged from `origin/main`, no pending
   changeset for the package, or a tag for the planned version that already
   exists locally or on origin.
2. **Bumps and gates:** runs `pnpm release:version`, dates the new `CHANGELOG`
   heading (`## 0.37.2 - 2026-09-28`), checks the section says something, and
   runs typecheck, lint, and the version tests. A failure here restores the
   tree.
3. **Commits and tags on `main`,** then pushes the annotated tag alone. The tag
   starts the Release workflow.
4. **Waits for that run,** then for npm to answer with the new version, and
   only then pushes `main`.

The release commit is the one commit made on `main` directly. Everything else
still goes through a topic branch.

`release:version` also runs `scripts/stamp.mts`, which rewrites two kinds of
pinned version to the new one:

- **The skill launchers.** `PINNED` in `skills/pptwise/scripts/run.sh` and
  `$Pinned` in `run.ps1`. This is the one that matters most: on a machine with
  no `pptwise` on `PATH`, that constant decides which release actually runs
  when a harness invokes the skill.
- **Every pinned install command in the repo's markdown** (the dsh
  `plugin add` lines in the READMEs and `INSTALL.md`, the no-script fallback
  commands in both SKILL files).

The drift test (`scripts/stamp.test.mts`, part of `pnpm check`) reads each one
back, so a forgotten stamp fails the release before it ships stale numbers.

### Why main waits for npm

`main` is what users install from: pptwise.com hands agents `INSTALL.md` on
`main`, which clones the skill whose launcher pins this version. A `main` that
pins a version npm does not have yet breaks every new install until it lands.
On 2026-09-27 that is exactly what happened: `main` went out with 0.37.0
pinned and the publish failed. So the tag goes first, and a failed release
leaves `main`, and every install, untouched. Step 1 checks `main` can
fast-forward before the tag goes out, so the later push lands the tree the tag
released.

### When the release run fails

`main` has not moved. Fix the cause, then either re-run the workflow for the
same tag, or retract the tag and start over (the script prints the exact
commands). The export XML changing since the last release still needs the
PowerPoint repair-dialog probe before `pnpm release` (`docs/testing.md`).

## The Release workflow

`.github/workflows/release.yml` runs on every pushed `v*` tag:

1. Refuses a tag that is not the version in `package.json`.
2. Runs typecheck, lint, the full test suite, and `pnpm e2e` with LibreOffice
   installed, so the visual gate is not silently skipped.
3. Extracts this version's `CHANGELOG` section, and fails if there is none.
   All of this happens before the one irreversible step.
4. Publishes with provenance through npm trusted publishing (OIDC), skipped
   when the version is already on npm, so a hand publish never turns the run
   red.
5. Creates the GitHub Release from the tag with that section as its notes,
   skipped when it already exists.

npm matches the workflow by file name. The package's trusted publisher is
registered as GitHub Actions, owner `liustack`, repository `pptwise`, workflow
`release.yml`, no environment. If the two ever disagree (a renamed file, an
environment added on one side), the OIDC exchange answers "package not
found", npm quietly falls back to setup-node's placeholder token, and the job
fails with `E404` on the `PUT`. That E404 is npm refusing the write, not a
missing package.

## Publishing by hand

Only when CI publishing is down. Run the gates yourself first, since
`prepublishOnly` only builds:

```bash
pnpm check && pnpm e2e
npm publish --access public
```

On a machine running concurrent heavy sessions the vitest leg can hit
spurious timeouts. Bound the workers (`VITEST_MAX_THREADS=2
VITEST_MAX_FORKS=2 pnpm check`) rather than skipping the gate, and
isolate-rerun any failing file to confirm it is contention, not a regression.
Then push the tag as usual: the workflow sees the version on npm, skips the
publish, and still cuts the GitHub Release. Push `main` last.
