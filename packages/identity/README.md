# @quarks.studio/identity

DDD functionality with domain rules, application ports and injected adapters.

- Root: models, ports and use cases, without React or Ink.
- `/http`: infrastructure factories accepting dependencies.
- `/hooks`: shared React hooks.
- `/presentation`: providers and presentation contracts.

Run `pnpm nx test identity` and `pnpm nx build identity`.

`/web` exports `UserAvatarMenu` and presentation hooks for its provider and logout menus.
Wrap the menu in `IdentityProvider` or use the configured menu from `registry/web`.
