# @quark/installer

Instalador seguro y recursivo de skills. Resuelve versiones/dependencias, valida permisos, verifica SHA-256, audita y extrae TAR, aplica mappings de forma transaccional y escribe `skill.lock.yml`.

Reutiliza automáticamente bundles verificados desde `~/.quark/cache/skills`; `force` obliga una descarga. Soporta skills Node/Python porque instala artefactos sin reinterpretar su runtime.

API: `install`, `installSkill`, `uninstall`, `InstallOptions` e `InstallResult`.

```bash
pnpm nx build installer
pnpm nx test installer
```
