# @quarks.studio/identity

DDD functionality with domain rules, application ports and injected adapters.

- Root: models, ports and use cases, without React or Ink.
- `/http`: infrastructure factories accepting dependencies.
- `/hooks`: shared React hooks.
- `/presentation`: providers and presentation contracts.

Run `pnpm nx test identity` and `pnpm nx build identity`.

`/web` exports `UserAvatarMenu` and presentation hooks for its provider and logout menus.
Wrap the menu in `IdentityProvider` or use the `ConfiguredUserAvatarMenu` from `@quarks.studio/identity/web`.

## Local emulator login

The configured menu shows **Ingresar con emulador** only when `QUARK_ENV=local`.
Set `QUARK_AUTH_EMULATOR_HOST` to `localhost:9099` or a full HTTP URL. The button
automatically signs in as `developer@quark.local` with `quark-local-password`,
the account created by the server's local bootstrap. It does not create accounts.
Override the local account using `QUARK_AUTH_EMULATOR_EMAIL` and
`QUARK_AUTH_EMULATOR_PASSWORD`. These development credentials are included in
the local browser bundle; use only emulator accounts. Restart/rebuild the Web
app after changing environment variables.

`useAuthLogin().login('emulator')` shares the provider login state and rejects
requests outside the local environment. The `/configured` entry exposes
`loginWithLocalEmulator()` for the same automatic flow and `loginWithEmulator()`
for explicit credentials; both exchange the emulator token with the registry
and return the stored API session.

The unified hook accepts `login(provider, options?)`, where the provider is an
`AuthProvider` or `'emulator'`. For example, `login('google', { strategy: 'deep-link' })`.
`useLogInItems(isLoading, fn, environment?)` sends every choice to the same callback
and disables all authentication choices while loading.

The CLI provider selector includes `emulator` in the local environment. Set
`QUARKS_ENV=local` (or the existing `QUARK_ENV=local`) and
`QUARK_AUTH_EMULATOR_HOST=localhost:9099`, then run `quark auth login`
or `quark auth login emulator`. If both environment variables are set,
`QUARKS_ENV` takes precedence for CLI selection and emulator authentication.
