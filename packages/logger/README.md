# `@quarks.studio/logger`

Leveled logging for the Quark CLI and its libraries. Writes to `stderr` and
defaults to `silent` (nothing emitted), so importing the logger is safe in Node
and browser bundles.

Levels follow npm-style precedence: `silent`, `error`, `warn`, `notice`,
`http`, `info`, `verbose`, `silly`. A configured level emits messages of that
level or more severe.

```ts
import { logger } from '@quarks.studio/logger';

logger.info(`installed ${name}@${version}`);
```

The shared logger is configured once at startup, for example from a CLI flag or
config value:

```ts
import { resolveLogLevel, setLogLevel } from '@quarks.studio/logger';

setLogLevel(resolveLogLevel([process.env['QUARK_LOG_LEVEL']]));
```

To pick a level out of command-line arguments (`--loglevel <level>` /
`--loglevel=<level>` / `--verbose`), use `logLevelFromArgv`, then resolve it
(matching `--loglevel` beats `--verbose`):

```ts
import { logLevelFromArgv, resolveLogLevel } from '@quarks.studio/logger';

const level = resolveLogLevel([logLevelFromArgv(process.argv.slice(2))]);
```
