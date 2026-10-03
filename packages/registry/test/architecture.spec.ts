import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
it('registry has no external imports or package dependencies', () => {
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (file.endsWith('.ts')) {
        const source = readFileSync(file, 'utf8');
        for (const match of source.matchAll(
          /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g,
        ))
          expect(match[1]).toMatch(/^\./);
      }
    }
  };
  visit(join(__dirname, '../src'));
  const manifest = JSON.parse(
    readFileSync(join(__dirname, '../package.json'), 'utf8'),
  );
  expect(manifest.dependencies).toEqual({});
});
