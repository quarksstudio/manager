import { isLogLevelEnabled, parseLogLevel, type LogLevel } from './log-levels';

export interface LogStream {
  write(message: string): unknown;
}

export interface LoggerOptions {
  level?: LogLevel;
  stream?: LogStream;
  color?: boolean;
}

const LEVEL_COLORS: Partial<Record<LogLevel, string>> = {
  error: '\u001b[31m',
  warn: '\u001b[33m',
  notice: '\u001b[36m',
  http: '\u001b[35m',
  info: '\u001b[32m',
  verbose: '\u001b[90m',
  silly: '\u001b[90m',
};

const RESET = '\u001b[0m';
const DEFAULT_LEVEL: LogLevel = 'silent';

function defaultStream(): LogStream {
  if (typeof process === 'undefined' || !process.stderr) {
    return { write: () => undefined };
  }
  return process.stderr;
}

export class Logger {
  private readonly level: LogLevel;
  private readonly stream: LogStream;
  private readonly color: boolean;

  constructor(options: LoggerOptions = {}) {
    this.level = parseLogLevel(options.level, DEFAULT_LEVEL);
    this.stream = options.stream ?? defaultStream();
    this.color =
      options.color ?? Boolean((this.stream as { isTTY?: boolean }).isTTY);
  }

  get logLevel(): LogLevel {
    return this.level;
  }

  enabled(level: LogLevel): boolean {
    return isLogLevelEnabled(this.level, level);
  }

  error(message: string): void {
    this.write('error', message);
  }

  warn(message: string): void {
    this.write('warn', message);
  }

  notice(message: string): void {
    this.write('notice', message);
  }

  http(message: string): void {
    this.write('http', message);
  }

  info(message: string): void {
    this.write('info', message);
  }

  verbose(message: string): void {
    this.write('verbose', message);
  }

  silly(message: string): void {
    this.write('silly', message);
  }

  private write(level: LogLevel, message: string): void {
    if (!this.enabled(level)) return;
    const label = level.toUpperCase().padEnd(7);
    const line = this.color
      ? `${LEVEL_COLORS[level] ?? ''}${label}${RESET} ${message}`
      : `${label} ${message}`;
    this.stream.write(`${line}\n`);
  }
}

let sharedStream: LogStream = defaultStream();
let configuredLevel: LogLevel = DEFAULT_LEVEL;
let configuredColor: boolean | undefined;
let shared: Logger = new Logger({ stream: sharedStream });

function sync(): void {
  shared = new Logger({
    level: configuredLevel,
    stream: sharedStream,
    color: configuredColor,
  });
}

export function configureLogging(options: LoggerOptions = {}): void {
  if (options.stream) sharedStream = options.stream;
  if (options.level) configuredLevel = options.level;
  if (options.color !== undefined) configuredColor = options.color;
  sync();
}

export function setLogLevel(level: LogLevel): void {
  configureLogging({ level });
}

export function getLogLevel(): LogLevel {
  return configuredLevel;
}

export function isLevelEnabled(level: LogLevel): boolean {
  return shared.enabled(level);
}

export const logger: Pick<
  Logger,
  'error' | 'warn' | 'notice' | 'http' | 'info' | 'verbose' | 'silly'
> = {
  error: (message) => shared.error(message),
  warn: (message) => shared.warn(message),
  notice: (message) => shared.notice(message),
  http: (message) => shared.http(message),
  info: (message) => shared.info(message),
  verbose: (message) => shared.verbose(message),
  silly: (message) => shared.silly(message),
};
