# @quark/targz

Canonical archive adapter for Quark skill and agent packages.

## API

- `pack(source, destination)` creates a deterministic `.tar.gz` bundle.
- `unpack(archive, destination)` extracts a bundle with traversal guards.
- `check(path)` validates a package directory before packaging.
- `inspect(buffer, expected)` delegates structural Tier 1 inspection to `@quark/tester` and returns its SHA-256, file list, size, and validated manifest.
- Manifest helpers parse and validate `skill.yml`, `agent.yml`, and the legacy `skills.yml` format.

Mapped paths must be explicit, relative files. Globs, links, duplicate archive entries, path traversal, oversized archives, and identity mismatches are rejected.

This package is the primary archive implementation shared by manager and server code. Consumers should not copy its unpacking or manifest-validation logic.

## Development

```bash
pnpm nx build targz
pnpm nx test targz
```
