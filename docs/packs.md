---
summary: 'Content packs from the client side: the license key, packs sync and packs list, the two pack-server endpoints, the pack archive format, local install state, and where pack themes sit in the theme lookup'
read_when:
  - setting up, checking, or clearing a license key
  - running or debugging `pptwise packs sync`, or reading its `--json` report
  - a pack was skipped or refused, or a pack theme does not resolve
  - pointing the CLI at a mirror or a test server with `PPTWISE_PACKS_URL`
  - building or checking a pack archive
---

# Content packs

A content pack is a versioned archive of extra themes that a license key unlocks. `pptwise packs sync` downloads the packs a license covers and installs them under `$PPTWISE_HOME/packs/`. From then on their themes resolve by name like workspace themes, and `pptwise themes --json` lists them.

The CLI and the pack server agree only on the interface described here, protocol version 1.

## Commands

```bash
pptwise license set <key>
pptwise license status
pptwise license clear
pptwise packs sync [--json]
pptwise packs list [--json]
```

`license set` checks the key's shape and writes it to `$PPTWISE_HOME/license.json` as `{"key": "ptw_..."}`, readable by the owner only (mode 0600). A key is `ptw_` followed by 32 characters from `a-z` and `2-7`, 36 characters in all. Whether a key is valid is the server's answer, not the CLI's. `license status` says whether a key is configured and shows its first eight characters, never more. `license clear` deletes the file. Installed packs stay installed.

`packs sync` reads the license, asks the server for its catalog, and brings every listed pack up to date:

- Without a license it prints one line and exits 0, so a script or skill can run it unconditionally.
- A pack already installed at the catalog's version is left alone. Nothing is downloaded.
- A pack missing locally or at another version is downloaded, checked, and installed (see [Before install](#before-install)).
- A pack whose `engine` range does not include the running pptwise is skipped with a note to update pptwise. An installed older version stays.
- A pack that fails a check, or whose download breaks off, is reported and not installed. Other packs still sync. The version installed before, if any, stays in place.
- When the catalog cannot be read (no network, 401, 403, 503, an unreadable body), nothing on disk changes and the command says why.

The exit code is 0 when every pack is installed, current, or skipped for its engine range, and 1 when the catalog could not be read or any pack failed.

`--json` prints the report:

```json
{
  "license": true,
  "ok": true,
  "server": "https://pptwise.com",
  "packs": [
    { "id": "sample", "version": "2026.1.0", "title": "Sample pack", "status": "installed", "themes": ["sample-brief"] }
  ]
}
```

`status` is one of `installed`, `updated` (with `previous`, the version it replaced), `current`, `incompatible` (with `reason`), or `failed` (with `reason`). A catalog failure sets `ok` to `false`, leaves `packs` empty, and puts the message in `error`. Without a license the report is `{"license": false, "ok": true, "packs": []}`.

`packs list` prints each installed pack with its version, title, and theme ids. `--json` prints the same as an array with each pack's directory and each theme's file path.

## Server

The base URL defaults to `https://pptwise.com`. `PPTWISE_PACKS_URL` overrides it, for a mirror or a test server, and may carry a path prefix. Every request carries the license key, so the address must be `https`. Plain `http` is accepted only on this machine's loopback (`localhost`, `127.0.0.1`, `::1`). Any other `http` address is refused before a request is sent. The key goes in the `Authorization` header:

```text
Authorization: Bearer ptw_...
```

Errors are JSON with one human sentence, `{"error": "..."}`, which the CLI repeats.

### `GET /api/packs/catalog`

`200` returns the full catalog. Every valid key sees the same list.

```json
{
  "catalog": 1,
  "packs": [
    {
      "id": "sample",
      "version": "2026.1.0",
      "title": "Sample pack",
      "size": 12345,
      "sha256": "<sha256 of the zip file, lowercase hex>",
      "engine": ">=0.37.0 <1.0.0"
    }
  ]
}
```

Pack ids are lowercase letters, digits, and inner hyphens (`^[a-z0-9][a-z0-9-]*$`). Versions are runs of letters and digits joined by `.` or `-` (`^[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*$`, such as `2026.1.0`). Both become part of the download path and of a directory name on disk, and the CLI reports a catalog entry outside those shapes as failed. Theme ids are unique across the whole catalog: no two packs ship the same theme id.

`engine` is an npm semver range. The CLI installs a pack only when the range includes its own version. It reads unions (`||`), comparators, partial and `x` versions, `~`, `^`, and hyphen ranges, and treats a range it cannot read as one it does not meet.

| status | meaning |
| --- | --- |
| `401` | No key was sent, or the key does not exist. |
| `403` | The key has been revoked. |
| `503` | The server is not configured to serve packs. |

A revoked key only stops new downloads. Nothing is deleted remotely: packs already installed stay installed and keep working.

### `GET /api/packs/<id>/<version>.zip`

`200` returns the archive as `application/zip`. Its bytes hash to the `sha256` of the same catalog entry. `401` and `403` mean what they mean for the catalog. `404` means there is no such pack or version.

## Pack archive

The archive's root holds `pack.json`:

```json
{
  "pack": 1,
  "id": "sample",
  "version": "2026.1.0",
  "title": "Sample pack",
  "engine": ">=0.37.0 <1.0.0",
  "themes": ["themes/sample-brief.theme.json"]
}
```

Every field shown is required, `themes` included. `id`, `version`, `title`, and `engine` are the same as in the pack's catalog entry. Each entry of `themes` is a path inside the archive to one complete version 2 theme file, the same format as a workspace theme (see [Themes](./themes.md)). Fields a version 1 client does not know are ignored. `examples` (example deck project directories) and `assets` (an image library) are reserved for later versions.

Every path in the archive, and every path in `themes`, is relative and uses `/`. `..` segments, absolute paths, drive letters, backslashes, and symbolic links are not allowed.

### Before install

The CLI refuses a pack, and changes nothing on disk, unless all of these hold:

1. The download's sha256 equals the catalog's.
2. It is a readable zip whose entries all follow the path rules above.
3. `pack.json` parses, and its `id` and `version` equal the catalog entry's.
4. Its `engine` range includes the running pptwise.
5. Every listed theme file is in the archive and passes the checks every theme file passes: the strict schema, the menu contract, and the contrast floor.
6. No theme id equals a factory preset, a retired theme id, another theme in the same pack, or a theme of another installed pack.

## Local state

```text
$PPTWISE_HOME/                 (default ~/.pptwise)
  license.json                 {"key": "ptw_..."}, mode 0600
  packs/
    <id>/
      pack.json
      themes/...               the unpacked archive
```

An install unpacks into a hidden directory beside `packs/<id>/` and then swaps the whole directory in, so a pack is always one complete version, never half of two. Entries of `packs/` whose names start with `.` are installs in progress and are never read as packs.

A directory under `packs/` that is not a readable pack (no `pack.json`, a manifest naming another id, a listed theme file missing or failing the theme file checks, a theme with a factory preset's or a retired id, or a theme id another installed pack also ships) is reported with its path and the way to repair it. `packs sync` never installs any of these, so they come from a pack edited or copied by hand. `themes` and `schema --kind` judge a pack by the same checks. `packs sync` reinstalls a pack the catalog still lists. Remove any other such directory by hand. Until then:

- A lookup for a factory preset's name never reads the packs, since no pack may ship that id, so presets keep working.
- A lookup for any other name fails, since the name may be in the damaged pack.
- `pptwise themes --json` still lists the presets and every readable pack. The damaged pack appears once, in place of its themes, as `{"source": "pack", "pack": "<directory name>", "error": "<message>"}`. The plain listing prints it as a `(pack <name>)` line.
- `packs list` fails with the damaged directory's path.

## Theme lookup

Theme names resolve in four levels, first hit wins:

1. The deck directory.
2. Workspace `themes/` directories, walking upward.
3. Installed packs, `$PPTWISE_HOME/packs/*/`.
4. The factory presets.

A deck binds a pack theme by name, the same way it binds any other: `"theme": "sample-brief"` in `deck.spec.json`. A deck or workspace file with the same id shadows the pack theme, which is how a user freezes or edits one: `pptwise theme new --from sample-brief -o deck-dir/theme.json --id sample-brief`. A pack theme never shares an id with a preset, so a preset name always means the preset unless a deck or workspace file says otherwise, and its lookup skips the packs.

`pptwise themes --json` lists the presets with `"source": "builtin"`, then every installed pack theme with `"source": "pack"` and `"pack": "<id>"`, and an entry with an `error` field for a pack it cannot read (see [Local state](#local-state)). An unknown name fails and lists every place searched, including each installed pack directory. `pptwise serve` picks up a sync that installs or updates a bound pack theme within its regular two-second theme check.
