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

## Generated test variants

The tester never decides which variants run: the runner generates them and
passes the already-generated prompts through `TestRunnerOptions.extraTests`:

```typescript
interface ExtraTest {
  baseTestId: string;
  input: { prompt: string };
}
```

Each extra test reuses the promise `assertions` of its base test; all of them
must pass. Tier 3 adds a random 20–30% and Tier 4 a 30–50% of the declared
tests (ceil), selected with a fixed seed. The runner that generates variants is
the same LLM engine that executes the tests (e.g. Hermes Agent); see
`server/docs/llm-test-variants.md`.

## Coverage classification and determinism ratio

Tier 3 does not cover LLM-generated free text. `VerificationResult` separates
coverage into:

- `deterministicCoverage` — checks over artifacts and non-LLM fields
  (`file_created`, `file_match`, `schema`, `equals` on non-LLM data,
  `http_mocks` consumed, `trajectory_sequence`, `max_steps_not_exceeded`,
  security scan). This is the tier 3 gate.
- `llmCoverage` — `regex`/`equals` over agent-generated output (informative).
- `determinismRatio` — `deterministicChecks / totalChecks` (static), plus an
  empirical figure from re-runs that reproduce identical artifact results.

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

## CLI

Screens and command adapters live in `src/CLI`, one React component per file.
Import them through `@quark/tester/CLI`; the main entrypoint keeps its
business API and does not load CLI presentation. Shared Ink components and
terminal helpers come from `@quark/ui/CLI`.
