# @quark/runtime

Dominio y aplicación para ejecutar un skill ya instalado. Resuelve el entrypoint validado, construye la ejecución y mantiene el runtime separado de instalación, publicación y certificación.

Node y Python se describen en el manifiesto; la ejecución concreta debe respetar permisos y aislamiento provistos por el host.

```bash
pnpm nx build runtime
pnpm nx test runtime
```
