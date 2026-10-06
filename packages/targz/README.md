# @quarks.studio/targz

Canonical archive adapter for Quark skill and agent packages.

## API

- `pack(source, destination)` creates a deterministic `.tar.gz` bundle.
- `unpack(archive, expectedHash, destination)` verifies integrity and extracts a validated bundle.
- `check(buffer, expected)` validates the archive and its expected name/version.
- `inspect(buffer, expected)` delegates structural Tier 1 inspection to `@quarks.studio/tester` and returns its SHA-256, file list, size, and validated manifest.
- Manifest helpers parse and validate `skill.yml`, `agent.yml`, and the legacy `skills.yml` format.

Mapped paths must be explicit, relative files. Globs, links, duplicate archive entries, path traversal, oversized archives, and identity mismatches are rejected.

This package is the primary archive implementation shared by manager and server code. Consumers should not copy its unpacking or manifest-validation logic.

## Development

```bash
pnpm nx build targz
pnpm nx test targz
```

Archive auditing is shared with tester before extraction: canonical duplicate
paths and unsupported entry types are rejected. Limits are 10000 entries,
1024-character paths, 250 MiB declared content, 50 MiB compressed input and
280 MiB expanded tar including metadata. `readArchiveResponse(response)` buffers
HTTP bundles up to the compressed limit, then cancels oversized streams.
Modern manifests are schema-validated and their mapped sources checked.
See [M04/M05/M11](../../docs/solucion-hallazgos-restantes.md).
