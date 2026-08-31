# @quark/actions

Casos de uso presentacionales compartidos por CLI/UI: instalación, publicación, búsqueda, eliminación, autenticación, configuración y administración de caché.

`Publish` verifica localmente, muestra `VerificationResult`, genera un lockfile no certificado, empaqueta y sube el `.tgz`. `Cache` expone list/verify/clean. Este paquete coordina APIs; las reglas viven en installer, tester, targz y local-store.

```bash
pnpm nx build actions
pnpm nx test actions
```
