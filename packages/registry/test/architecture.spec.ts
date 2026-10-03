import { promises as fs } from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../src');

const CONTEXTS = ['commerce', 'package-search', 'certification', 'distribution', 'identity', 'publisher'];

const FORBIDDEN = [
  /^react$/,
  /^react-dom/,
  /^ink$/,
  /^@quarks\.studio\/ui(\/|$)/,
  // The barrel re-exports the React hook; the `/storage` subpath is headless.
  /^@quarks\.studio\/use-storage$/,
];

const isForbidden = (specifier: string) =>
  FORBIDDEN.some((pattern) => pattern.test(specifier));

async function read(file: string): Promise<string | null> {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return null;
  }
}

async function sourcesUnder(directory: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(directory, {
      withFileTypes: true,
      recursive: true,
    });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
      .map((entry) => path.join(entry.parentPath ?? directory, entry.name));
  } catch {
    return [];
  }
}

function importsOf(source: string): string[] {
  const specifiers: string[] = [];
  const pattern = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) specifiers.push(match[1]);
  return specifiers;
}

async function resolveRelative(
  from: string,
  specifier: string,
): Promise<string | null> {
  const base = path.resolve(path.dirname(from), specifier);
  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ]) {
    if (await read(candidate)) return candidate;
  }
  return null;
}

function layerFiles(layer: string): Promise<string[]> {
  return Promise.all(
    CONTEXTS.map((context) => sourcesUnder(path.resolve(SRC, '../../', context, 'src', layer))),
  ).then((groups) => groups.flat());
}

const HEADLESS_LAYERS = ['domain', 'application'];

/** Names a use case or a domain object has no business reaching for. */
const OUTWARD_SEGMENTS = ['transport', 'composition', 'client', 'lib', 'hooks'];

function forbiddenSegment(specifier: string): string | undefined {
  if (!specifier.startsWith('.')) return undefined;
  return specifier
    .replace(/^\.\.?\//, '')
    .split('/')
    .find((segment) => OUTWARD_SEGMENTS.includes(segment));
}

/**
 * The core is what lets a server renderer, a CLI and a browser share one
 * transport. It stops doing that the moment someone imports the configuration
 * singleton or a React dependency into it, so this is a hard gate.
 */
describe('the domain and application layers are headless', () => {
  it('do not import React, ink, the UI kit or the configuration singleton', async () => {
    const sources = (await Promise.all(HEADLESS_LAYERS.map(layerFiles))).flat();
    expect(sources.length).toBeGreaterThan(0);

    for (const file of sources) {
      const source = (await read(file)) as string;
      for (const specifier of importsOf(source)) {
        if (specifier === '@quarks.studio/config' || isForbidden(specifier)) {
          throw new Error(
            `${path.relative(SRC, file)} must stay headless but imports ${specifier}`,
          );
        }
      }
    }
  });

  it('do not reach the transport, the composition root or the entrypoints', async () => {
    const sources = (await Promise.all(HEADLESS_LAYERS.map(layerFiles))).flat();
    expect(sources.length).toBeGreaterThan(0);

    for (const file of sources) {
      const source = (await read(file)) as string;
      for (const specifier of importsOf(source)) {
        const segment = forbiddenSegment(specifier);
        if (segment) {
          throw new Error(
            `${path.relative(SRC, file)} must not import ${specifier}`,
          );
        }
      }
    }
  });
});

/**
 * A domain that imports its own adapters is not a domain: the moment a use case
 * needs a rule change, so does every screen that imported the rule.
 */
describe('a bounded context depends on its own layers only', () => {
  it('the domain imports neither the application nor the infrastructure layer', async () => {
    for (const file of await layerFiles('domain')) {
      const source = (await read(file)) as string;
      for (const specifier of importsOf(source)) {
        if (/^\.{1,2}\/.*\/(application|infrastructure)\b/.test(specifier)) {
          throw new Error(
            `${path.relative(SRC, file)} must not import ${specifier}`,
          );
        }
      }
    }
  });

  it('the application layer never imports an infrastructure layer', async () => {
    for (const file of await layerFiles('application')) {
      const source = (await read(file)) as string;
      for (const specifier of importsOf(source)) {
        if (/^\.{1,2}\/.*\/infrastructure\b/.test(specifier)) {
          throw new Error(
            `${path.relative(SRC, file)} must not import ${specifier}`,
          );
        }
      }
    }
  });

  it('a context never reaches into another context', async () => {
    for (const layer of ['domain', 'application', 'infrastructure']) {
      for (const file of await layerFiles(layer)) {
        const source = (await read(file)) as string;
        for (const specifier of importsOf(source)) {
          expect(specifier).not.toMatch(/^@quarks\.studio\/registry(?:\/|$)/);
          expect(specifier).not.toMatch(/^@quarks\.studio\/[^/]+\/src\//);
        }
        const context = path.relative(SRC, file).split(path.sep)[0];
        for (const specifier of importsOf(source)) {
          const target = specifier.replace(/^\.{1,2}\//, '').split('/')[0];
          if (
            CONTEXTS.includes(target) &&
            target !== context &&
            // `../<context>/domain` is a cross-context read and always a smell.
            specifier.startsWith('.')
          ) {
            throw new Error(
              `${path.relative(SRC, file)} must not import across contexts (${specifier})`,
            );
          }
        }
      }
    }
  });
});

/**
 * The whole point of `./headless` is that a Node-only consumer can import it
 * without pulling the renderer in. A static walk of the import graph catches a
 * regression at review time instead of in a bundled artifact.
 */
describe('the headless entrypoint stays headless', () => {
  it('never reaches React, ink, the UI kit or the storage barrel', async () => {
    const root = path.join(SRC, 'headless.ts');
    const seen = new Set<string>();
    const queue = [root];

    while (queue.length > 0) {
      const file = queue.shift() as string;
      if (seen.has(file)) continue;
      seen.add(file);

      const source = (await read(file)) as string;
      for (const specifier of importsOf(source)) {
        if (isForbidden(specifier)) {
          throw new Error(
            `${path.relative(SRC, file)} imports ${specifier}, which is not headless`,
          );
        }
        if (specifier.startsWith('@quarks.studio/')) {
          const config = JSON.parse(await fs.readFile(path.resolve(SRC, '../../../tsconfig.base.json'), 'utf8'));
          const target = config.compilerOptions.paths[specifier]?.[0];
          if (target) queue.push(path.resolve(SRC, '../../..', target));
          continue;
        }
        if (!specifier.startsWith('.')) continue;
        if (/(^|\/)hooks$/.test(specifier)) {
          throw new Error(
            `${path.relative(SRC, file)} imports the React hooks (${specifier})`,
          );
        }
        const resolved = await resolveRelative(file, specifier);
        if (resolved) queue.push(resolved);
      }
    }

    expect(seen.size).toBeGreaterThan(5);
  });
});

/**
 * `/upload`, `/client` and `/headless` are resolved by path, not by name: the
 * subpath exports in `package.json`, the tsconfig paths and the publisher's
 * jest mapping all point at these files. Moving one is a breaking change to
 * every published consumer, so it is pinned here.
 */
describe('the published entrypoints stay where they are', () => {
  const FROZEN = [
    'index.ts',
    'client.ts',
    'headless.ts',
    path.join('CLI', 'index.ts'),
    path.join('infrastructure', 'upload-package-archive.ts'),
  ];

  it.each(FROZEN)('%s exists', async (file) => {
    expect(await read(path.join(SRC, file))).not.toBeNull();
  });

  it('the upload entrypoint still exposes the archive uploader and the endpoint reader', async () => {
    const source = (await read(
      path.join(SRC, 'infrastructure', 'upload-package-archive.ts'),
    )) as string;

    expect(source).toContain('uploadPackageArchive');
    expect(source).toContain('registryConfiguration');
  });
});
