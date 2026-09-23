import { PackageDetails } from '@quarks.studio/ui/web';
import type { PackageDetails as Detail } from '@quarks.studio/registry/client';
const demo: Detail = {
  id: 'demo',
  name: 'demo',
  description: 'Public React component demo',
  authors: ['demo'],
  tags: ['example'],
  downloads: 42,
  canEditMetadata: true,
  versions: [{ version: '1.0.0' }, { version: '0.9.0' }],
};
export function App() {
  const parts = window.location.pathname
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent);
  const name = parts[1] ?? 'demo';
  const selected = parts[2] ?? '1.0.0';
  const scenario = new URLSearchParams(window.location.search).get('state');
  const detail = {
    ...demo,
    id: name,
    name,
    versions: scenario === 'empty' ? [] : demo.versions,
    canEditMetadata: scenario !== 'readonly',
  };
  const versions = Object.fromEntries(
    (detail.versions ?? []).map((v) => [
      v.version,
      `/packages/${encodeURIComponent(name)}/${v.version}`,
    ]),
  );
  return (
    <>
      <header className="p-4">
        <a href="/">Quark · public demo</a>
        <nav>
          {[
            'ready',
            'loading',
            'error',
            'empty',
            'readonly',
            'readme-error',
          ].map((state) => (
            <a className="mr-3" key={state} href={`?state=${state}`}>
              {state}
            </a>
          ))}
        </nav>
      </header>
      <PackageDetails
        packageName={name}
        detail={detail}
        selectedVersion={selected}
        loading={scenario === 'loading'}
        error={scenario === 'error' ? 'Demo error' : undefined}
        readme={{
          content: '# Public components\n\nRendered with example data.',
          error: scenario === 'readme-error' ? 'Demo error' : undefined,
        }}
        urls={{ retry: window.location.pathname, versions, downloads: {} }}
      />
    </>
  );
}
export default App;
