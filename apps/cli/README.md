# @quark/cli

Command-line interface for installing, publishing, searching, and managing Quark skills.

## Responsibilities

- Authenticate users and maintain local CLI configuration.
- Install skills for one or more model targets, reusing the local archive cache.
- Run local verification and publish immutable skill archives to the server.
- Search, remove, and inspect cached skills.

`publish` only reports local verification. It never creates an official certificate: after upload, the server performs Tier 1 synchronously and owns every official Tier 2–4 certification.

## Commands

```bash
quark auth login github
quark search jira
quark install jira-ticket-manager --models openai,claude --where ./workspace
quark publish ./jira-ticket-manager --tier TIER_1
quark cache list
quark cache verify
quark cache clean
```

Use `quark publish <folder> --dry-run` to build and verify an archive without uploading it. Authentication tokens are stored by the actions and local-store packages; do not pass credentials as command arguments.

## Development

```bash
pnpm nx build cli
pnpm nx serve cli
```

The executable is emitted to `dist/apps/cli`. The command implementation delegates workflows to `@quark/actions` rather than accessing the registry directly.
