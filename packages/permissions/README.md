# @quarks.studio/permissions

Policies and consent for capabilities requested by skills. It compares the
manifest with `UserPolicy`, returns granted/denied permissions and offers the
prompt used by the CLI.

Installer must run this validation before writing any skill to its destination.

```bash
pnpm nx build permissions
pnpm nx test permissions
```