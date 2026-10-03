# @quarks.studio/storage

One persistence package for Node and browsers, organized around domain contracts,
application storage rules, infrastructure adapters and shared React hooks.

- Root: headless key/value storage, namespaces, TTL and metadata.
- `/installations`: filesystem catalogs, locks and verified SHA-256 artifacts.
- `/http-cache`: persistent implementation of the registry response-cache port.
- `/hooks`: `useStorage`, `useQuery` and `useCachedQuery`.
- `/query`: shared query hooks and contracts.
- `/CLI`: list, verify and clean cached artifacts, using terminal-ui.

Every hook has one implementation in `src/hooks/useX.ts`, shared by CLI and Web.
Node adapters are loaded only when the Node backend is used; the browser mapping
keeps filesystem modules out of browser bundles.

Run `pnpm nx build storage` and `pnpm nx test storage`.
