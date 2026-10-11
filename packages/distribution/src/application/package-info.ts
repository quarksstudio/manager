import type { PackageDetails } from '../domain/package-details';
import { sortVersions, selectPackageVersion } from '../domain/package-details';
import { certificationBadge } from '../domain/certification-badge';
interface PackageInfoServices {
  get(name: string): Promise<unknown>;
  getBundleUrl?(name: string, version: string): string;
}

export async function loadPackageInfo(
  input: string,
  services: PackageInfoServices,
) {
  const separator = input.lastIndexOf('@');
  const name = separator > 0 ? input.slice(0, separator) : input;
  const selector = separator > 0 ? input.slice(separator + 1) : 'latest';
  const pkg = (await services.get(name)) as PackageDetails;
  const versions = sortVersions(pkg.versions ?? []);
  const selected = selectPackageVersion({ ...pkg, versions }, selector);
  if (
    (!selected && versions.length > 0) ||
    (!selected && selector && selector !== 'latest')
  ) {
    throw new Error(`Version not found: ${name}@${selector}`);
  }
  const badge = certificationBadge(selected?.certifications);
  return {
    summary: `${name}@${selected?.version ?? 'N/A'} | ${selected?.manifest?.license || 'N/A'} | deps: ${Object.keys(selected?.manifest?.dependencies ?? {}).length} | versions: ${versions.length}`,
    description: selected?.description || 'N/A',
    heading:
      selected?.version === pkg.latestVersion || !selected
        ? 'By latest version'
        : `By version ${selected.version}`,
    tarball: selected
      ? (services.getBundleUrl?.(name, selected.version) ?? 'N/A')
      : 'N/A',
    shasum: selected?.dist.shasum || 'N/A',
    integrity: selected?.dist.integrity || 'N/A',
    certification: badge?.label ?? 'None',
    authors: pkg.authors ?? [],
    versions: versions.filter((e, i) => i <= 5 ).map((version) => version.version),
  };
}
