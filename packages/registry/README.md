# @quarks.studio/registry

Dependency-free HTTP transport for CLI, Web and server hosts.

`createHttpContext({ baseUrl, token, fetch, cache, onUnauthorized })` exposes
`request` and `fetchJson`. The caller supplies configuration, sessions and cache
ports. Both the root and `/http` export this transport and its contracts.

Pass JSON request bodies as objects in `body`; the transport serializes them once
and sets `Content-Type: application/json`, overriding any conflicting content
type. Strings require an explicit `Content-Type` and are sent unchanged.
`FormData` is sent unchanged; omit its content type so `fetch` supplies the
multipart boundary. Requests without a body do not acquire a JSON content type.

Identity, package distribution, search, commerce and certification adapters live
in their respective packages. Registry has no React, CLI, Web, upload, aggregate
client or business API entrypoints.
