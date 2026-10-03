# @quarks.studio/certification

DDD functionality with domain rules, application ports and injected adapters.

- Root: models, ports and use cases, without React or Ink.
- `/http`: infrastructure factories accepting dependencies.
- `/hooks`: shared React hooks.
- `/presentation`: providers and presentation contracts.

Run `pnpm nx test certification` and `pnpm nx build certification`.

Domain contracts are exported by this package; there is no shared types facade.

The root also owns `Certification`, `CertificationStatus`, `CertificationTier`,
`CERTIFICATION_TIERS` and `parseCertificationTier`. Verification, publication
and distribution consume these contracts without defining their own tier union.
