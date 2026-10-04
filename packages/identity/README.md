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

The configured menu shows **Ingresar con emulador** only when `QUARKS_ENV=local`.
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
`QUARKS_ENV=local` and
`QUARK_AUTH_EMULATOR_HOST=localhost:9099`, then run `quark auth login`
or `quark auth login emulator`. The same `QUARKS_ENV` variable controls Web, CLI
and emulator authentication.

## Read the stored session

Session queries read the shared storage and honor its TTL; they do not validate
or refresh tokens with the server.

```ts
import { getSession, getAccessToken, isAuthenticated } from '@quarks.studio/identity';

const session = await getSession(); // IdentitySession | null
const token = await getAccessToken(); // string | null
const signedIn = await isAuthenticated(); // boolean
```

These functions are also available from `/configured`. Storage failures reject
their promises. `IdentitySession` permits older entries without a user or refresh
token; `AuthSession` remains the result of login.

```tsx
import { useIdentitySession } from '@quarks.studio/identity/web';

function SessionStatus() {
  const { isAuthenticated, loading, error } = useIdentitySession();
  if (loading) return <span>Loading session…</span>;
  if (error) return <span>Unable to read session</span>;
  return <span>{isAuthenticated ? 'Signed in' : 'Signed out'}</span>;
}
```

The hook is also exported from `/hooks` and needs no `IdentityProvider`. It
returns `session`, `accessToken`, `isAuthenticated`, `loading`, `error`, and
`reload()`. It reloads after session writes, storage events, and window focus.
Expiry is checked on reads, without polling; authenticated means a stored,
nonempty access token is present, not that the server has verified it.

## Public profiles and usernames

`ConfiguredUserProfile` loads profiles through identity hooks and services.
The profile URL uses the unique username; package queries and ownership checks
use the immutable user ID. New sessions carry `user.id` and `user.username`;
legacy browser sessions resolve `auth/me` before building username-based links.
Only the owner sees the username editor, which writes to `POST /v1/auth/me`,
updates the stored identity and navigates to the new profile URL.
