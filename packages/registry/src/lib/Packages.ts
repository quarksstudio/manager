import type { PackageInterface, VersionInterface } from '@quark/types/models';

export async function search(this: any, str = ''): Promise<any> {
  return this._fetch(`package?query=${encodeURIComponent(str)}`);
}

export async function get(this: any, name: string): Promise<any> {
  return this._fetch(`package/${encodeURIComponent(name)}`);
}

export async function getVersion(
  this: any,
  name: string,
  version: string,
): Promise<any> {
  return this._fetch(
    `package/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
  );
}

export async function downloadBundle(
  this: any,
  name: string,
  version: string,
): Promise<Response> {
  return this._request(
    `package/${encodeURIComponent(name)}/${encodeURIComponent(version)}/bundle`,
  );
}

export async function update(
  this: any,
  { id, ...body }: PackageInterface,
  isNew = false,
): Promise<any> {
  return this._fetch(`package/${isNew ? '' : encodeURIComponent(id)}`, {
    method: isNew ? 'POST' : 'PATCH',
    body,
  });
}

export async function createVersion(
  this: any,
  name: string,
  body: VersionInterface,
): Promise<any> {
  return this._fetch(
    `package/${encodeURIComponent(name)}/${encodeURIComponent(body.version)}`,
    {
      method: 'POST',
      body,
    },
  );
}

export async function proxy(
  this: any,
  name: string,
  path: string,
): Promise<any> {
  return this._fetch(`package/${encodeURIComponent(name)}/${path}`, {
    proxy: true,
  });
}
