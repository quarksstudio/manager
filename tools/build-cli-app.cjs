const { readFileSync, writeFileSync } = require('node:fs');
const { dirname, join } = require('node:path');
const { readCachedProjectGraph } = require('@nx/devkit');
const { createLockFile } = require('@nx/js');

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
          writeFileSync(
            join(directory, 'pnpm-lock.yaml'),
            createLockFile(pkg, readCachedProjectGraph(), 'pnpm'),
          );
        });
      },
    },
  ],
};
