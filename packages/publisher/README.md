# @quark/publisher

Publicación de skills y agentes sin React ni Ink. `domain` define contratos y
errores; `application` coordina el flujo mediante puertos; `infrastructure`
conecta filesystem, tester, empaquetado y transporte del registry.

```ts
import { publishPackage } from '@quark/publisher';
import { configureRegistry } from '@quark/registry/upload';

configureRegistry('https://registry.example/api');
const result = await publishPackage({ sourceDir: './my-skill', dryRun: true });
```

`dryRun: true` (o `upload: false`) verifica, escribe el snapshot y empaqueta sin
subir. Para subir, omite `dryRun` y proporciona `token` o
`MANAGER_SERVER_TOKEN`. El endpoint se comparte con `Client.API`.

`publishPackage(options, onProgress?)` informa las etapas `validate`, `verify`,
`pack` y `upload`. Una verificación fallida lanza `VerificationFailure` antes
de escribir o empaquetar. Los códigos de salida y la presentación pertenecen
al consumidor.

`createPublishPackage(dependencies)` permite inyectar proyecto, verificador,
empaquetador, transporte y reloj. Exporta también `PublishOptions`,
`PublishResult`, `PublishProgress` y los contratos de esos puertos.

Validación: `pnpm nx test publisher` y `pnpm nx build publisher`.

## CLI

Screens and command adapters live in `src/CLI`, one React component per file.
Import them through `@quark/publisher/CLI`; the main entrypoint keeps its
business API and does not load CLI presentation. Shared Ink components and
terminal helpers come from `@quark/ui/CLI`.
