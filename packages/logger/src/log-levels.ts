export const LOG_LEVELS = [
  'silent',
  'error',
  'warn',
  'notice',
  'http',
  'info',
  'verbose',
  'silly',
] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

const LOG_LEVEL_RANK: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  notice: 3,
  http: 4,
  info: 5,
  verbose: 6,
  silly: 7,
};

export function isLogLevel(value: unknown): value is LogLevel {
  return (
    typeof value === 'string' &&
    (LOG_LEVELS as readonly string[]).includes(value)
  );
}

export function parseLogLevel(
  value: unknown,
  fallback: LogLevel = 'silent',
): LogLevel {
  return isLogLevel(value) ? value : fallback;
}

export function isLogLevelEnabled(
  configured: LogLevel,
  level: LogLevel,
): boolean {
  const threshold = LOG_LEVEL_RANK[configured];
  return threshold !== 0 && LOG_LEVEL_RANK[level] <= threshold;
}

export function logLevelFromArgv(
  argv: ReadonlyArray<string>,
): string | undefined {
  let verbose = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--verbose') verbose = true;
    if (arg === '--loglevel') {
      const value = argv[index + 1];
      if (value !== undefined && !value.startsWith('-')) return value;
    }
    if (arg.startsWith('--loglevel=')) return arg.slice('--loglevel='.length);
  }
  return verbose ? 'verbose' : undefined;
}

export function resolveLogLevel(
  candidates: ReadonlyArray<unknown>,
  fallback: LogLevel = 'silent',
): LogLevel {
  for (const candidate of candidates) {
    if (isLogLevel(candidate)) return candidate;
  }
  return fallback;
}
