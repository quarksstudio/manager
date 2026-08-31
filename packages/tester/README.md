# @quark/tester

Deterministic contract testing and verification for Quark skills and agents.

The package is published to NPM and is the canonical owner of Tier 1 archive inspection. Servers should call `inspectPackageArchive(buffer, expectedIdentity)` instead of implementing manifest, mapping, hash, or archive checks independently.

The process sandbox is suitable for local Tier 1 and Tier 2 verification. Tier 3 and Tier 4 require an injected sandbox adapter that reports strong network isolation.

## Test command protocol

`skill.yml` or `agent.yml` must declare `testCommand` and may declare `runtime: node` or `runtime: python`. The runtime is descriptive; execution remains command-based so either ecosystem can use its own virtual environment and package manager.

```yaml
# Node
runtime: node
testCommand: node dist/test-handler.js
```

```yaml
# Python
runtime: python
testCommand: python -m skill_test_handler
```

The runner writes one language-neutral JSON input document to stdin. The command must write exactly one JSON envelope to stdout:

```json
{ "output": { "status": "completed" }, "events": [{ "tool": "lookup" }] }
```

HTTP and tool mocks are exposed as JSON through `MANAGER_HTTP_MOCKS` and `MANAGER_TOOL_MOCKS`, so they can be consumed with `JSON.parse` in Node or `json.loads` in Python. Production Tier 3/4 callers must inject a Docker or WASM-style `SandboxAdapter` for the selected runtime. The tester verifies evidence; server-only code owns payment validation, signing, timestamping, audit authorization, and certificate issuance.

## Server-managed execution

Production certification must use `requestServerCertification`. It calls the authenticated server certification endpoint; the server publishes the certification event and launches the configured Cloud Run Job container. The manager never receives Docker credentials or controls the container runtime directly.

Tier 1 is the exception: the server performs it synchronously while ingesting the uploaded archive, before persisting or publishing the version. Container jobs begin at Tier 2. A later certification request reuses the immutable Tier 1 ingestion result instead of executing the package again.

Set `wait: true` to poll the certification resource until it reaches a terminal status. Remote server URLs require HTTPS; plain HTTP is accepted only for localhost development.

The CLI uses `MANAGER_SERVER_TOKEN` so bearer credentials do not appear in the process arguments:

```bash
MANAGER_SERVER_TOKEN=... quark-tester server my-skill \
  --server https://api.manager.dev --version 1.0.0 --product tier-3 --wait
```

## API and development

The public entry points are `runSkillTests`, `runAgentTests`, `inspectPackageArchive`, and `requestServerCertification`. Verification returns a `VerificationResult`; it is not proof of certification.

```bash
pnpm nx build tester
pnpm nx test tester
```
