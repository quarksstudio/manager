import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const ts = createRequire(import.meta.url)('typescript');
test('cache index preserves independent writers in separate processes', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cache-processes-'));
  try {
    const module = join(dir, 'cache.cjs');
    writeFileSync(
      module,
      ts.transpileModule(
        readFileSync(
          new URL(
            '../../packages/storage/src/infrastructure/skill-cache.ts',
            import.meta.url,
          ),
          'utf8',
        ),
        {
          compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
          },
        },
      ).outputText,
    );
    const worker = join(dir, 'worker.cjs');
    writeFileSync(
      worker,
      `const {cacheSkill}=require('./cache.cjs'); const {createHash}=require('crypto'); (async()=>{for(let i=0;i<12;i++){const bundle=Buffer.from(process.argv[2]+':'+i); await cacheSkill(bundle,{name:'skill-'+process.argv[2]+'-'+i,version:'1',registry:'https://registry.test',hash:createHash('sha256').update(bundle).digest('hex')},process.argv[3]);}})().catch(error=>{console.error(error);process.exitCode=1});`,
    );
    const cache = join(dir, 'data');
    await Promise.all(
      Array.from(
        { length: 6 },
        (_, index) =>
          new Promise((resolve, reject) => {
            const child = spawn(
              process.execPath,
              [worker, String(index), cache],
              { stdio: ['ignore', 'ignore', 'pipe'] },
            );
            let error = '';
            child.stderr.on('data', (chunk) => {
              error += chunk;
            });
            child.on('error', reject);
            child.on('close', (code) =>
              code === 0
                ? resolve()
                : reject(new Error(error || `Worker exited ${code}`)),
            );
          }),
      ),
    );
    const index = JSON.parse(readFileSync(join(cache, 'index.json'), 'utf8'));
    assert.equal(Object.keys(index.artifacts).length, 72);
    for (const hash of Object.keys(index.artifacts))
      assert.equal(
        createHash('sha256')
          .update(readFileSync(join(cache, 'sha256', hash + '.tgz')))
          .digest('hex'),
        hash,
      );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
