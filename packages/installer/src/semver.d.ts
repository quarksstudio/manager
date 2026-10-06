/** Types for the small node-semver API used by the installer. */
declare module 'semver' {
  export function compare(a: string, b: string): number;
  export function valid(version: string): string | null;
  export function validRange(range: string): string | null;
  export function satisfies(version: string, range: string): boolean;
}
