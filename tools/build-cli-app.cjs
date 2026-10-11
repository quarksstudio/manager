const {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
} = require('node:fs');
const { dirname, join, resolve } = require('node:path');
const { readCachedProjectGraph } = require('@nx/devkit');
const { createLockFile } = require('@nx/js');
const { createRequire } = require('node:module');
const { parse, stringify } = createRequire(
  resolve(__dirname, '../apps/cli/package.json'),
)('yaml');

module.exports = {
  jsx: 'automatic',
  banner: {
    js: '#!/usr/bin/env -S node --disable-warning=ExperimentalWarning',
  },
  plugins: [
    {
      name: 'cli-package-boundaries',
      setup(build) {
        build.onEnd((result) => {
          if (result.errors.length) return;
          for (const output of Object.values(result.metafile.outputs)) {
            for (const imported of output.imports) {
              if (
                imported.external &&
                imported.path.startsWith('@quarks.studio/')
              ) {
                throw new Error(
                  `CLI still depends on workspace package: ${imported.path}`,
                );
              }
            }
          }
          const directory = dirname(build.initialOptions.outfile);
          const file = join(directory, 'package.json');
          const pkg = JSON.parse(readFileSync(file, 'utf8'));
          for (const field of [
            'dependencies',
            'devDependencies',
            'peerDependencies',
            'optionalDependencies',
          ]) {
            for (const name of Object.keys(pkg[field] ?? {})) {
              if (name.startsWith('@quarks.studio/')) delete pkg[field][name];
            }
          }
          writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
          const lock = createLockFile(pkg, readCachedProjectGraph(), 'pnpm');
          writeFileSync(join(directory, 'pnpm-lock.yaml'), lock);
          const workspace = parse(readFileSync('pnpm-workspace.yaml', 'utf8'));
          const patchedDependencies = {};
          mkdirSync(join(directory, 'patches'), { recursive: true });
          for (const name of Object.keys(
            parse(lock).patchedDependencies ?? {},
          )) {
            const patch = workspace.patchedDependencies?.[name];
            if (!patch) throw new Error(`Missing runtime patch for ${name}`);
            const relative = `patches/${name.replace(/[^a-zA-Z0-9._-]/g, '_')}.patch`;
            copyFileSync(resolve(patch), join(directory, relative));
            patchedDependencies[name] = relative;
          }
          writeFileSync(
            join(directory, 'pnpm-workspace.yaml'),
            stringify({
              packages: [],
              allowBuilds: workspace.allowBuilds ?? {},
              ...(workspace.overrides
                ? { overrides: workspace.overrides }
                : {}),
              patchedDependencies,
            }),
          );
          copyFileSync('tools/local/cli.mjs', join(directory, 'local-cli.mjs'));
          writeFileSync(
            join(directory, '.dockerignore'),
            'node_modules\nsrc\nmeta.json\n',
          );
        });
      },
    },
  ],
};
