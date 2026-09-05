# @quark/registry

React hooks for authenticated registry access:

- `useSearchPackages(query)`
- `useFetchPackage(name)`
- `useCurrentUser()`
- `useRegistryClient()` for event handlers and mutations

Node workflows can use the lower-level `apiFetch` and `apiRequest` exports.
# @quark/registry

Cliente del registry, autenticación y hooks React. También expone `registerAuditorPasskey` y `signAuditDecision`, que ejecutan las ceremonias WebAuthn S4 contra los endpoints del servidor sin manejar claves privadas en JavaScript.
