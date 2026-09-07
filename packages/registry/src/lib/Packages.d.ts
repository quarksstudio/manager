import type { PackageInterface, VersionInterface } from '@quark/types/models';
export declare function search(this: any, str?: string): Promise<any>;
export declare function get(this: any, name: string): Promise<any>;
export declare function getVersion(
  this: any,
  name: string,
  version: string,
): Promise<any>;
export declare function downloadBundle(
  this: any,
  name: string,
  version: string,
): Promise<Response>;
export declare function update(
  this: any,
  { id, ...body }: PackageInterface,
  isNew?: boolean,
): Promise<any>;
export declare function createVersion(
  this: any,
  name: string,
  body: VersionInterface,
): Promise<any>;
export declare function proxy(
  this: any,
  name: string,
  path: string,
): Promise<any>;
