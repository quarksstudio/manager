export function packageUrl(name: string, version?: string) {
  return `/${encodeURIComponent(name)}${version ? `/${encodeURIComponent(version)}` : ''}`;
}
