# @quark/local-store

Persistencia local de instalaciones y caché global de artefactos. Mantiene catálogos/locks por proyecto y bundles content-addressed en `~/.quark/cache/skills/sha256/<hash>.tgz`.

API de instalaciones: `getSkillPath`, `registerInstall`, `removeSkill`, `listInstalled`. API de caché: `cacheSkill`, `readCachedSkill`, `listSkillCache`, `verifySkillCache`, `cleanSkillCache`.

Las escrituras son temporales + rename; un bundle corrupto se descarta antes de reutilizarlo.

```bash
pnpm nx build local-store
pnpm nx test local-store
```

## CLI

Screens and command adapters live in `src/CLI`, one React component per file.
Import them through `@quark/local-store/CLI`; the main entrypoint keeps its
business API and does not load CLI presentation. Shared Ink components and
terminal helpers come from `@quark/ui/CLI`.
