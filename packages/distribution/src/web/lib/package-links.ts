export function packageUrl(name: string, version?: string) {
  return `/${encodeURIComponent(name)}${version ? `/${encodeURIComponent(version)}` : ''}`;
}

export function downloadUrl(name: string, version: string) {
  return `${packageUrl(name, version)}/download`;
}

export function navigate(url: string) {
  window.location.replace(url);
}
