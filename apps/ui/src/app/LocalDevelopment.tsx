import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, loginWithEmulator } from '@quarks.studio/registry';

export function LocalDevelopment() {
  const [message, setMessage] = useState('');
  const [packages, setPackages] = useState<Array<{ id: string }>>([]);
  const refresh = () =>
    apiFetch<{ items: Array<{ id: string }> }>('/v1/package', {
      useCache: false,
    })
      .then((result) => setPackages(result.items))
      .catch((error) => setMessage(String(error)));
  useEffect(() => {
    void refresh();
  }, []);
  return (
    <section className="mx-auto max-w-6xl space-y-3 p-4">
      <p>Local environment · simulated payments and certifications</p>
      <div className="flex flex-wrap gap-3">
        {['developer', 'admin', 'security-admin', 'auditor'].map((user) => (
          <button
            key={user}
            className="rounded border px-3 py-1"
            onClick={() => {
              void loginWithEmulator(
                'http://localhost:9099',
                `${user}@quark.local`,
                'quark-local-password',
              )
                .then(() => {
                  setMessage(`Session: ${user}`);
                  void refresh();
                })
                .catch((error) => setMessage(String(error)));
            }}
          >
            Sign in as {user}
          </button>
        ))}
      </div>
      <p role="status">{message}</p>
      <button className="underline" onClick={() => void refresh()}>
        Refresh packages
      </button>
      <ul>
        {packages.map((pkg) => (
          <li key={pkg.id}>
            <Link
              className="underline"
              to={`/packages/${encodeURIComponent(pkg.id)}`}
            >
              {pkg.id}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
