# @quarks.studio/runtime

Domain and application to run an already-installed skill. It resolves the
validated entrypoint, builds the execution and keeps the runtime separate from
installation, publication and certification.

`executeSkill` fails closed for restricted executions. The built-in Node,
Python and native process adapter cannot enforce filesystem, network or tool
restrictions. Granting a manifest's declared permissions is an authorization
check; it does not provide process isolation.

Applications can supply a trusted `PermissionEnforcingHost` as the sixth argument:

```ts
executeSkill(manifest, skillPath, args, allowedEnv, policy, host);
```

The host receives the resolved entrypoint, runtime, arguments, working directory,
explicit environment and immutable requested permissions in `SkillExecution`.
It must enforce those restrictions or reject before starting the skill. Host
implementations belong to trusted application configuration, never to a manifest
or downloaded skill. A host error propagates without falling back to an ordinary
process. The built-in Linux host below provides a restrictive kernel implementation.
Other supplied implementations must be validated against filesystem, network
and subprocess escape attempts.

Direct execution with the user's normal privileges remains available only when
both manifest and policy explicitly authorize unrestricted access:

```ts
manifest.permissions = { filesystem: true, network: ['*'], tools: ['*'] };
const policy = {
  allowFilesystem: true,
  allowedDomains: ['*'],
  allowedTools: ['*'],
};
executeSkill(manifest, skillPath, args, allowedEnv, policy);
```

This mode applies no sandbox restrictions. A permissive policy alone does not
make a restricted manifest unrestricted. Existing executions with omitted,
false or narrower permissions now require an enforcing host and are rejected
when none is configured.

```bash
pnpm exec jest --config packages/runtime/jest.config.cts --runInBand
pnpm exec tsc --noEmit -p packages/runtime/tsconfig.lib.json
```

Restricted Node execution on Linux can now use `LinuxPermissionHost`. Compile
`native/host.c` with `cc -O2 -Wall -Wextra -Werror -o /trusted/path/quark-host
native/host.c` and keep the executable under trusted application ownership. Pass
`new LinuxPermissionHost('/trusted/path/quark-host')` as `host`.

This implementation supports read-only package files with no network or tools.
It rejects broader requests, other runtimes, unsupported platforms and kernels
without Landlock ABI 3. It installs Landlock and seccomp **before** Node starts,
so restrictions cover libuv threads as well as synchronous calls. Node heap,
CPU, elapsed time and output have limits. The launcher also enforces a 2 GiB address-space hard limit, including native
allocations. Node versions or workloads needing larger virtual reservations
fail within the sandbox. Production admission must account for concurrent
processes when choosing container or host memory capacity.

Restricted executions use a private snapshot copied through pinned directory
descriptors. Symlinks, hardlinks, special files and oversized packages are
rejected. Changes to the installed entrypoint or dependencies after copying
cannot redirect execution. Snapshots are removed when the child exits.
