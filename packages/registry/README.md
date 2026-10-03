# @quarks.studio/registry

Dependency-free HTTP transport for CLI, Web and server hosts.

`createHttpContext({ baseUrl, token, fetch, cache, onUnauthorized })` exposes
`request` and `fetchJson`. The caller supplies configuration, sessions and cache
ports. Both the root and `/http` export this transport and its contracts.

Identity, package distribution, search, commerce and certification adapters live
in their respective packages. Registry has no React, CLI, Web, upload, aggregate
client or business API entrypoints.
