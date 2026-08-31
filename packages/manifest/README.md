# @quark/manifest

Parser y validador del manifiesto ejecutable de un skill instalado. Normaliza nombre, versión, entrypoint, runtime, permisos y dependencias antes de que installer/runtime los utilicen.

No inspecciona archivos comprimidos; esa responsabilidad pertenece a `@quark/tester` y `@quark/targz`.

```bash
pnpm nx build manifest
pnpm nx test manifest
```
