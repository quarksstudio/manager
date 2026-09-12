import {
  Navigate,
  Route,
  Routes,
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { PackageDetails, usePackageDetailsView } from '@quark/ui/web';

function LatestVersionRoute() {
  const { packageName = '' } = useParams();
  const name = decodeURIComponent(packageName);
  const view = usePackageDetailsView(name);
  if (view.loading) return null;
  if (view.latestVersion) {
    return (
      <Navigate
        to={`/packages/${encodeURIComponent(name)}/${encodeURIComponent(view.latestVersion)}`}
        replace
      />
    );
  }
  return <PackageDetails packageName={name} />;
}

function VersionPackageRoute() {
  const { packageName = '', versionPackage = '' } = useParams();
  const name = decodeURIComponent(packageName);
  const version = decodeURIComponent(versionPackage);
  const navigate = useNavigate();
  return (
    <PackageDetails
      key={`${name}:${version}`}
      packageName={name}
      initialVersion={version}
      onVersionChange={(next) =>
        navigate(
          `/packages/${encodeURIComponent(name)}/${encodeURIComponent(next)}`,
        )
      }
    />
  );
}

export function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/" className="text-lg font-semibold">
            Quark
          </Link>
        </div>
      </header>
      <Routes>
        <Route
          path="/"
          element={
            <div className="mx-auto w-full max-w-6xl px-4 py-16 text-muted-foreground">
              Select a package to view its details.
            </div>
          }
        />
        <Route path="/packages/:packageName" element={<LatestVersionRoute />} />
        <Route
          path="/packages/:packageName/:versionPackage"
          element={<VersionPackageRoute />}
        />
      </Routes>
    </div>
  );
}

export default App;
