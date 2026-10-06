import { gzipSync } from 'zlib';
import * as tar from 'tar';

export const modernManifest = [
  'name: audit',
  'version: 1.0.0',
  'description: Audit fixture',
  'runtime: node',
  'testCommand: node run.cjs',
  'entrypoint: run.cjs',
  'mapper_files:',
  '  ".":',
  '    tools:',
  '      tools/run.cjs: run.cjs',
  '',
].join('\n');

export function archive(
  entries: Array<{
    path: string;
    content?: string;
    size?: number;
    type?: tar.Header['type'];
  }>,
): Buffer {
  const blocks: Buffer[] = [];
  for (const entry of entries) {
    const content = Buffer.from(entry.content ?? '');
    const header = new tar.Header({
      path: entry.path,
      type: entry.type ?? 'File',
      size: entry.size ?? content.length,
      mode: 0o600,
    });
    header.encode();
    if (header.needPax) blocks.push(new tar.Pax({ path: entry.path }).encode());
    blocks.push(
      header.block!,
      content,
      Buffer.alloc((512 - (content.length % 512)) % 512),
    );
  }
  return gzipSync(Buffer.concat([...blocks, Buffer.alloc(1024)]));
}
