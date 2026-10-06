import { readFileSync } from 'node:fs';
import path from 'node:path';

const inventory = require('./dependency-advisories.json');
const lockfile = readFileSync(
  path.join(__dirname, '../../pnpm-lock.yaml'),
  'utf8',
);
const packages = lockfile.split('\npackages:\n')[1]?.split('\nsnapshots:\n')[0];
if (!packages)
  throw new Error('Cannot locate pnpm lockfile package resolutions');
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Offline guards against the exact vulnerable pins returned by npm audit.
// Refresh the inventory after upgrading; these do not simulate CVE exploits.
for (const advisory of inventory.advisories) {
  it(`${advisory.id}: ${advisory.module} ${advisory.advisory} has no known affected pin`, () => {
    const affected = advisory.findings
      .map((finding: { version: string }) => finding.version)
      .filter((version: string) =>
        new RegExp(
          `^  ['"]?${escape(advisory.module)}@${escape(version)}['"]?:`,
          'm',
        ).test(packages),
      );
    expect([...new Set(affected)]).toEqual([]);
  });
}
