import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const workspace = process.cwd();
const version = process.argv[2];

if (
  !version ||
  !/^\d+\.\d+\.\d+(?:-(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?$/.test(
    version,
  )
)
  throw new Error(
    `Usage: node tools/set-release-version.mjs <version> (e.g. 0.1.0 or 0.2.0-beta)`,
  );

const sourceGroups = ['packages', 'apps'];
const updated = [];
for (const group of sourceGroups) {
  const sourceRoot = path.join(workspace, group);
  for (const directory of (await readdir(sourceRoot)).sort()) {
    const manifestFile = path.join(sourceRoot, directory, 'package.json');
    const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
    if (!manifest.name || !manifest.version || manifest.private) continue;
    manifest.version = version;
    await writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
    updated.push(manifest.name);
  }
}

console.log(
  `Set ${updated.length} packages to ${version}: ${updated.join(', ')}`,
);
