# @quarks.studio/local-store

Local persistence of installations and a global cache of artifacts. It keeps
per-project catalogs/locks and content-addressed bundles in
`~/.quark/cache/skills/sha256/<hash>.tgz`.

Installation API: `getSkillPath`, `registerInstall`, `removeSkill`,
`listInstalled`. Cache API: `cacheSkill`, `readCachedSkill`,
`listSkillCache`, `verifySkillCache`, `cleanSkillCache`.

Writes are temp + rename; a corrupted bundle is discarded before being reused.

```bash
pnpm nx build local-store
pnpm nx test local-store
```

## CLI

Screens and command adapters live in `src/CLI`, one React component per file.
Import them through `@quarks.studio/local-store/CLI`; the main entrypoint keeps
its business API and does not load CLI presentation. Shared Ink components and
terminal helpers come from `@quarks.studio/ui/CLI`.