# @quark/use-storage

Isomorphic TTL storage for Quark browser, Electron renderer, CLI and backend applications.

`createStorage` selects a supported backend and exposes namespaced read/write/remove operations with expiry metadata. `useStorage` provides the reactive UI integration. Backends conform to `IStorageEngine`, allowing browser Web Storage and non-browser persistence to share the same contract.

Expired values are treated as missing. Callers should use a dedicated namespace and must not store raw secrets in browser-accessible storage.

## Development

```bash
pnpm nx build use-storage
pnpm nx test use-storage
```
