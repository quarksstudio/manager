import type { ProjectInterface } from '@quark/types/models';

export async function get(this: any, str = ''): Promise<any> {
  return this._fetch(`projects/${str}`);
}

export async function update(
  this: any,
  { id, ...body }: ProjectInterface,
): Promise<any> {
  return this._fetch(`projects/${id}`, {
    method: id ? 'POST' : 'PATCH',
    body,
  });
}

export async function del(this: any, id: string): Promise<any> {
  return this._fetch(`projects/${id}`, {
    method: 'DELETE',
  });
}

export async function download(
  this: any,
  name: string,
  path: string,
): Promise<any> {
  return this._fetch(`projects/${name}/${path}`, { proxy: true });
}

export async function upload(
  this: any,
  name: string,
  path: string,
  file: File,
): Promise<any> {
  return this._fetch(`projects/${name}/${path}`, { proxy: true });
}

export async function remove(
  this: any,
  name: string,
  path: string,
): Promise<any> {
  return this._fetch(`projects/${name}/${path}`, { method: 'DELETE' });
}
