# @quarks.studio/config

Configuration management for Quark. Every consumer — CLI, Astro server,
Electron shell, registry client and the uploader — resolves its settings through
`loadConfig()` instead of reading `process.env` or a file of its own.

## Resolution

Values are merged in this order, each layer overriding the one before it:

1. `DEFAULT_CONFIG` in `src/domain/config.ts`.
2. The values stored with `quark config set`, in the shared storage under
   `~/.cache/quarks/storage/`.
3. `QUARK_`-prefixed environment variables: the variable name is the key in
   camelCase, so `QUARK_EDITOR` sets `editor` and `QUARK_REGISTRY_URL` sets
   `registryUrl`. and `QUARK_LOG_LEVEL`.
4. The access token from the stored session.

`loadConfig()` is memoized, and reads are shared between concurrent callers. It
is invalidated automatically whenever the configuration or the session is
written, so a long-lived process such as the Astro server picks up a login
without a restart. `reloadConfig()` forces a re-read; `resetConfig()` drops the
memo, which is mostly useful in tests.

`getConfig()` is the synchronous read. It returns the last resolved value, or
the defaults when nothing has been awaited yet — a synchronous read cannot
observe a change that still needs an `await` to take effect.

## Credentials

`token` is never written to the configuration file. It lives in the session (set
by a login, or by `QUARK_TOKEN`, which wins over the session).
`withoutSecrets()` strips it, and `quark config get` refuses to print it.

Identity-provider credentials are not part of this configuration: the registry
server owns the `accounts:createAuthUri` handshake and holds its own secret.

## Storage

Configuration and session share one `createStorage({ namespace: 'quarks' })`
engine from `@quarks.studio/storage`, with the `config` and `auth:session`
keys. The import is the `/storage` subpath rather than the barrel so this
package stays importable from a process with no renderer.

## Entry points

- `@quarks.studio/config` — the whole configuration surface, free of React.
- `@quarks.studio/config/hooks` — `useConfig`, for React components.
- `@quarks.studio/config/CLI` — the Ink screens and command adapters.

```bash
pnpm nx build config
pnpm nx test config
```
