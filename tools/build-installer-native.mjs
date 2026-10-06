import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const platform = `${process.platform}-${process.arch}`;
if (
  ![
    'linux-x64',
    'linux-arm64',
    'darwin-x64',
    'darwin-arm64',
    'win32-x64',
    'win32-arm64',
  ].includes(platform)
)
  throw new Error(`Unsupported native build target ${platform}`);
const root = resolve('packages/installer');
const cache = resolve('dist/native-build', platform);
mkdirSync(cache, { recursive: true });
let include =
  process.env.QUARK_NODE_INCLUDE ||
  resolve(dirname(process.execPath), '../include/node');
let library;
async function verifiedDownload(relative, destination) {
  const base = `https://nodejs.org/dist/${process.version}/`;
  const sumsResponse = await fetch(`${base}SHASUMS256.txt`);
  if (!sumsResponse.ok) throw new Error('Cannot fetch Node checksums');
  const lines = (await sumsResponse.text()).split('\n');
  const expected = lines
    .find((line) => line.trim().split(/\s+/)[1] === relative)
    ?.split(/\s+/)[0];
  if (!expected) throw new Error(`No official Node checksum for ${relative}`);
  const response = await fetch(base + relative);
  if (!response.ok) throw new Error(`Cannot fetch ${relative}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash('sha256').update(bytes).digest('hex') !== expected)
    throw new Error(`Invalid Node checksum: ${relative}`);
  writeFileSync(destination, bytes);
}
if (!existsSync(join(include, 'node_api.h'))) {
  const archive = join(cache, 'headers.tar.gz');
  await verifiedDownload(`node-${process.version}-headers.tar.gz`, archive);
  execFileSync('tar', ['-xzf', archive, '-C', cache]);
  include = join(cache, `node-${process.version}`, 'include/node');
}
if (process.platform === 'win32') {
  library = join(cache, 'node.lib');
  await verifiedDownload(`win-${process.arch}/node.lib`, library);
}
const output = join(root, 'prebuilds', platform);
mkdirSync(output, { recursive: true });
const binary = join(output, 'directory.node');
const source = join(root, 'native/directory.cc');
if (process.platform === 'win32')
  execFileSync(
    'cl.exe',
    [
      '/nologo',
      '/std:c++17',
      '/EHsc',
      '/O2',
      '/LD',
      `/I${include}`,
      source,
      `/Fo${join(cache, 'directory.obj')}`,
      '/link',
      library,
      `/OUT:${binary}`,
      `/IMPLIB:${join(cache, 'directory.lib')}`,
    ],
    { stdio: 'inherit' },
  );
else
  execFileSync(
    process.env.CXX || 'c++',
    [
      '-std=c++17',
      '-O2',
      '-Wall',
      '-Wextra',
      '-shared',
      ...(process.platform === 'darwin'
        ? ['-undefined', 'dynamic_lookup']
        : ['-fPIC']),
      `-I${include}`,
      source,
      '-o',
      binary,
    ],
    { stdio: 'inherit' },
  );
const hash = createHash('sha256').update(readFileSync(binary)).digest('hex');
writeFileSync(join(output, 'sha256.txt'), `${hash}  directory.node\n`);
const dist = resolve('dist/packages/installer/prebuilds', platform);
mkdirSync(dist, { recursive: true });
for (const name of ['directory.node', 'sha256.txt'])
  copyFileSync(join(output, name), join(dist, name));
console.log(`Built and staged installer backend ${platform}`);
