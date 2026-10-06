# @quarks.studio/installer

Safe, recursive skill installer. It resolves versions/dependencies, validates
permissions, verifies SHA-256, audits and extracts TAR, applies mappings
transactionally and writes `skill.lock.yml`.

It automatically reuses verified bundles from `~/.quark/cache/skills`; `force`
forces a download. It supports Node/Python skills because it installs artifacts
without reinterpreting their runtime.

API: `install`, `installSkill`, `uninstall`, `InstallOptions` and
`InstallResult`.

```bash
pnpm nx build installer
pnpm nx test installer
```

## CLI

Screens and command adapters live in `src/CLI`, one React component per file.
Import them through `@quarks.studio/installer/CLI`; the main entrypoint keeps
its business API and does not load CLI presentation. Shared Ink components and
terminal helpers come from `@quarks.studio/terminal-ui`.

## Destination safety and platform support

The recursive install commit opens destination directories without following
symlinks and anchors file operations to their descriptors. Linked destination
components and final files are rejected, including metadata and lockfiles.
This implementation requires Linux with `/proc/self/fd`; recursive installation
on macOS or Windows is rejected until an equivalent secure adapter is available.
There is no unsafe pathname fallback. See
[the M07 correction and its limits](../../../server/docs/auditoria-consolidada-hallazgos.md#solución-de-m07).

Uninstallation uses the same Linux descriptor boundary for reads, removals,
rollback and lock updates. Unsafe linked paths are rejected. If rollback cannot
restore a file safely, its transaction backup is retained and its location is
included in the error. See [M06](../../../server/docs/auditoria-consolidada-hallazgos.md#solución-de-m06).

Version resolution uses node-semver: ordinary ranges exclude prereleases and
`latest` selects a stable release. Explicit build metadata matches exactly.
File and lock replacements participate in rollback; failed restoration preserves
transaction backups and reports their location. Bundle downloads are bounded to
50 MiB. See [M08/M09/M10/M11](../../../server/docs/auditoria-consolidada-hallazgos.md#correcciones-finales-de-manager-m03m11).
