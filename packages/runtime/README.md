# @quarks.studio/runtime

Domain and application to run an already-installed skill. It resolves the
validated entrypoint, builds the execution and keeps the runtime separate from
installation, publication and certification.

Node and Python runtimes are described in the manifest; the concrete execution
must respect the permissions and isolation provided by the host.

```bash
pnpm nx build runtime
pnpm nx test runtime
```