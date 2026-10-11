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

Registry requests must stay on the configured HTTP(S) origin, including its port,
and may not embed URL credentials. Automatic redirects are rejected to protect
registry credentials. Use a separate unauthenticated transport for external
resources. See [M03 and the final manager corrections](../../../server/docs/auditoria-consolidada-hallazgos.md#correcciones-finales-de-manager-m03m11).

## Package wire contracts

`@quarks.studio/registry/domain` exports the shared package, version, statistics,
certification, and metadata update types. Short package text is `summary`;
`versions[].description` is the README Markdown of that version. `latestVersion`
is a reference, statistics live in `stats`, and archive checksums live in `dist`.
The CLI and UI select the same version and use the embedded description without
a separate README request.
