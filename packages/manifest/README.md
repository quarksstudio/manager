# @quarks.studio/manifest

Parser and validator of the executable manifest of an installed skill. It
normalizes name, version, entrypoint, runtime, permissions and dependencies
before installer/runtime use them.

It does not inspect compressed files; that responsibility belongs to
`@quarks.studio/tester` and `@quarks.studio/targz`.

```bash
pnpm nx build manifest
pnpm nx test manifest
```

`resolveEntrypoint` requires an existing regular file physically inside the
canonical skill root. It returns the canonical path, permits internal symlinks
and rejects links outside the skill. Missing files, broken links, loops and
directories fail resolution. The check does not make interpreter startup atomic
with filesystem validation; see [M02 and concurrency limits](../../docs/solucion-m02-entrypoint-fisico.md).
