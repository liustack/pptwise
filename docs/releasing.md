---
summary: 'Release flow: changesets local mode, three-way version sync, pre-publish gates, manual passkey publish'
read_when:
  - preparing an npm release
  - a version-mismatch guard test fails
  - wondering why there is a .changeset directory
---

# Releasing

Versioning uses [changesets](https://github.com/changesets/changesets) in
local mode: version bumps are cut on a machine, not by a CI bot. Publishing
runs in CI from a pushed tag (the Publish workflow, trusted publishing), with
a maintainer's `npm publish` as the fallback while that is not registered on
npm. See "Publishing" below. The version's single source of truth is
`package.json`. `src/version.ts` mirrors it, pinned by
`src/version-sync.test.ts`, so a missed sync fails `pnpm check`.

## During development

Any wave that ships user-visible change should leave a changeset behind:

```bash
npx changeset        # pick the bump level, write a human-readable summary
```

This creates a markdown file under `.changeset/` that travels with the branch.
Multiple changesets accumulate — `changeset version` later collapses them into
one correct bump (two minors do not become two bumps).

## Cutting a release

On a release branch off `main`:

```bash
pnpm release:version   # changeset version + sync src/version.ts + stamp the docs
pnpm check             # guard tests confirm every copy of the version agrees
```

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

Review `CHANGELOG.md`, commit, merge to `main`, then tag the merge with an
annotated tag (`--follow-tags` never pushes a lightweight one).

**Push the tag first, and `main` only once npm has the version.** `main` is
what users install from: pptwise.com hands agents `INSTALL.md` on `main`,
which clones the skill whose launcher pins this version. A `main` that pins a
version npm does not have yet breaks every new install until it lands. On
2026-09-27 that is exactly what happened: `main` went out with 0.37.0 pinned
and the publish failed on npm.

```bash
v=$(node -p "require('./package.json').version")
git tag -a "v$v" -m "v$v"
git push origin "v$v"                     # the Publish workflow runs from the tag
npm view @liustack/pptwise@"$v" version   # wait until this answers $v
git push origin main
```

If the publish fails, `main` has not moved and nothing users install from
has changed. Fix the cause and re-run the workflow for the same tag.

## Publishing

1. `pnpm e2e` — full chain on the built CLI.
2. PowerPoint repair-dialog probe (`docs/testing.md`) — mandatory whenever the
   export XML changed since the last release.
3. `npm publish` — `prepublishOnly` reruns `pnpm check && pnpm e2e` as the
   final gate. On a machine running concurrent heavy sessions the vitest leg
   can hit spurious 30s timeouts — bound the workers for the publish run
   (`VITEST_MAX_THREADS=2 VITEST_MAX_FORKS=2 npm publish`) rather than
   skipping the gate, and isolate-rerun any failing file first to confirm
   it is contention, not a regression.

The Publish workflow (`.github/workflows/publish.yml`) publishes from a
pushed `v*` tag through npm trusted publishing (OIDC), with provenance. It
only works once the package's npm settings register a trusted publisher:
GitHub Actions, owner `liustack`, repository `pptwise`, workflow
`publish.yml`, no environment. Without that registration the job gets as far
as the upload and fails with `E404` on the `PUT`, which is npm refusing the
write, not a missing package. Until it is registered, publish by hand as
above, then re-run nothing: the tag and `main` order in "Cutting a release"
still applies.
