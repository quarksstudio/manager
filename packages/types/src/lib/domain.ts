export interface Clock {
  now(): Date;
}
export const systemClock: Clock = { now: () => new Date() };
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
export type Result<T, E extends Error = DomainError> =
  { ok: true; value: T } | { ok: false; error: E };
