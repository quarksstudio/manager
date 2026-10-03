export interface HomeProps {
  packages: Array<{ id: string; href: string }>;
  error?: string;
  local?: boolean;
  loginAction?: string;
  logoutAction?: string;
}
export function Home({
  packages,
  error,
  local,
  loginAction,
  logoutAction,
}: HomeProps) {
  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4">
      {local && (
        <section>
          <p>Local environment · simulated payments and certifications</p>
          {['developer', 'admin', 'security-admin', 'auditor'].map((user) => (
            <form key={user} method="post" action={loginAction}>
              <input type="hidden" name="user" value={user} />
              <button type="submit">Sign in as {user}</button>
            </form>
          ))}
        </section>
      )}
      {logoutAction && (
        <form method="post" action={logoutAction}>
          <button type="submit">Sign out</button>
        </form>
      )}
      {error && (
        <p role="alert">
          {error} <a href="/">Retry</a>
        </p>
      )}
      <ul>
        {packages.map((item) => (
          <li key={item.id}>
            <a href={item.href}>{item.id}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
