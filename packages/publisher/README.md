# @quarks.studio/publisher

Publication of skills and agents without React or Ink. `domain` defines the
contracts and errors; `application` coordinates the flow through ports;
`infrastructure` connects the filesystem, tester, packaging and registry
transport.

```ts
import { publishPackage } from '@quarks.studio/publisher';
import { configureRegistry } from '@quarks.studio/registry/upload';

configureRegistry('https://registry.example/api');
const result = await publishPackage({ sourceDir: './my-skill', dryRun: true });
```

`dryRun: true` (or `upload: false`) validates, writes the snapshot and packages
without uploading. To upload, omit `dryRun` and provide a `token` or
`MANAGER_SERVER_TOKEN`. The endpoint is shared with `Client.API`.

`publishPackage(options, onProgress?)` reports the `validate`, `verify`, `pack`
and `upload` stages. A failed verification throws `VerificationFailure` before
writing or packaging. Exit codes and presentation belong to the consumer.

`createPublishPackage(dependencies)` lets you inject the project, verifier,
packer, transport and clock. It also exports `PublishOptions`, `PublishResult`,
`PublishProgress` and the contracts of those ports.

Validation: `pnpm nx test publisher` and `pnpm nx build publisher`.

## CLI

Screens and command adapters live in `src/CLI`, one React component per file.
Import them through `@quarks.studio/publisher/CLI`; the main entrypoint keeps
its business API and does not load CLI presentation. Shared Ink components and
terminal helpers come from `@quarks.studio/ui/CLI`.
