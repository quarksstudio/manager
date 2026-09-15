import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const dryRun = process.argv.includes('--dry-run');
const root = path.join(process.cwd(), 'dist');
const order = JSON.parse(
  await readFile(path.join(root, 'publish-order.json'), 'utf8'),
);
for (const name of order) {
  const directory = await directoryFor(name);
  const manifest = JSON.parse(
    await readFile(path.join(directory, 'package.json'), 'utf8'),
  );
  if (dryRun) {
    run('npm', ['pack', '--dry-run', directory]);
    continue;
  }
  const exists =
    spawnSync(
      'npm',
      ['view', `${manifest.name}@${manifest.version}`, 'version'],
      { stdio: 'ignore' },
    ).status === 0;
  if (exists) {
    console.log(`Skipping existing ${manifest.name}@${manifest.version}`);
    continue;
  }
  run('npm', ['publish', directory, '--access', 'public', '--provenance']);
}

async function directoryFor(name) {
  const { readdir } = await import('node:fs/promises');
  for (const group of ['packages', 'apps']) {
    for (const entry of await readdir(path.join(root, group))) {
      const file = path.join(root, group, entry, 'package.json');
      try {
        const manifest = JSON.parse(await readFile(file, 'utf8'));
        if (manifest.name === name) return path.dirname(file);
      } catch {
        /* not a publishable project directory */
      }
    }
  }
  throw new Error(`Prepared package not found: ${name}`);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'pipe',
    env: process.env,
  });
  process.stdout.write(String(result.stdout ?? ''));
  process.stderr.write(String(result.stderr ?? ''));
  if (result.status !== 0) {
    const output = String(result.stderr || result.stdout || '').trim();
    const message =
      `::error::${command} ${args.join(' ')} failed:\n${output.split('\n').slice(-25).join('\n')}`.replaceAll(
        '\n',
        '%0A',
      );
    console.error(message);
    throw new Error(
      `${command} ${args.join(' ')} failed with ${result.status}`,
    );
  }
}
