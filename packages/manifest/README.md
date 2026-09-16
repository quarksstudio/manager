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
