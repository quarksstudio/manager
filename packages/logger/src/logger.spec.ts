import {
  Logger,
  configureLogging,
  getLogLevel,
  isLevelEnabled,
  logger,
  setLogLevel,
} from './logger';
import {
  LOG_LEVELS,
  isLogLevel,
  isLogLevelEnabled,
  logLevelFromArgv,
  parseLogLevel,
  resolveLogLevel,
} from './log-levels';

describe('log levels', () => {
  it('exposes the npm-style level set', () => {
    expect(LOG_LEVELS).toEqual([
      'silent',
      'error',
      'warn',
      'notice',
      'http',
      'info',
      'verbose',
      'silly',
    ]);
  });

  it('validates and parses level values', () => {
    expect(isLogLevel('info')).toBe(true);
    expect(isLogLevel('debug')).toBe(false);
    expect(parseLogLevel('verbose')).toBe('verbose');
    expect(parseLogLevel('debug')).toBe('silent');
    expect(parseLogLevel(undefined, 'error')).toBe('error');
  });

  it('follows threshold semantics', () => {
    expect(isLogLevelEnabled('silent', 'error')).toBe(false);
    expect(isLogLevelEnabled('warn', 'notice')).toBe(false);
    expect(isLogLevelEnabled('warn', 'error')).toBe(true);
    expect(isLogLevelEnabled('info', 'http')).toBe(true);
    expect(isLogLevelEnabled('info', 'verbose')).toBe(false);
    expect(isLogLevelEnabled('silly', 'silly')).toBe(true);
  });

  it('extracts the level from argv', () => {
    expect(logLevelFromArgv(['--verbose'])).toBe('verbose');
    expect(logLevelFromArgv(['test', '--json'])).toBeUndefined();
    expect(logLevelFromArgv(['--loglevel', 'info'])).toBe('info');
    expect(logLevelFromArgv(['--loglevel=error'])).toBe('error');
    expect(logLevelFromArgv(['--loglevel', 'info', '--verbose'])).toBe('info');
    expect(logLevelFromArgv(['--loglevel', '--verbose'])).toBe('verbose');
  });

  it('resolves the first valid candidate with a fallback', () => {
    expect(resolveLogLevel(['bogus', 'info', 'verbose'])).toBe('info');
    expect(resolveLogLevel(['bogus'])).toBe('silent');
    expect(resolveLogLevel([])).toBe('silent');
    expect(resolveLogLevel(['bogus'], 'error')).toBe('error');
  });
});

describe('logger', () => {
  function make(level: string): { lines: string[]; logger: Logger } {
    const lines: string[] = [];
    const stream = {
      write: (message: string) => lines.push(message.replace(/\n$/, '')),
    };
    return {
      lines,
      logger: new Logger({ level: level as never, stream, color: false }),
    };
  }

  it('emits messages at or below the configured level', () => {
    const { lines, logger: instance } = make('verbose');
    instance.error('boom');
    instance.warn('careful');
    instance.notice('heads up');
    instance.http('GET /api');
    instance.info('hi');
    instance.verbose('detail');
    instance.silly('trace');
    expect(lines).toHaveLength(6);
    expect(lines[0]).toContain('ERROR');
    expect(lines[3]).toContain('HTTP');
    expect(lines[5]).toContain('VERBOSE');
    expect(lines.join('|')).not.toContain('SILLY');
  });

  it('emits nothing at silent', () => {
    const { lines, logger: instance } = make('silent');
    instance.error('boom');
    expect(lines).toEqual([]);
  });

  it('defaults to silent', () => {
    const lines: string[] = [];
    const instance = new Logger({
      stream: { write: (m: string) => lines.push(m) },
      color: false,
    });
    instance.error('boom');
    expect(lines).toEqual([]);
  });

  it('label spans the requested width', () => {
    const { lines, logger: instance } = make('notice');
    instance.notice('attention');
    expect(lines[0]).toMatch(/^NOTICE /);
  });

  it('annotates colors only when requested', () => {
    const { lines, logger: plain } = make('error');
    plain.error('x');
    expect(lines[0]).not.toContain('\u001b[');
    const colored: string[] = [];
    const instance = new Logger({
      level: 'error',
      stream: { write: (m: string) => colored.push(m) },
      color: true,
    });
    instance.error('x');
    expect(colored[0]).toContain('\u001b[31m');
    expect(colored[0]).toContain('\u001b[0m');
  });

  it('exposes the resolved level', () => {
    const { logger: instance } = make('http');
    expect(instance.logLevel).toBe('http');
    expect(instance.enabled('http')).toBe(true);
    expect(instance.enabled('info')).toBe(false);
  });

  it('configures the shared logger', () => {
    const lines: string[] = [];
    configureLogging({
      level: 'info',
      stream: { write: (m: string) => lines.push(m.replace(/\n$/, '')) },
      color: false,
    });
    expect(getLogLevel()).toBe('info');
    expect(isLevelEnabled('verbose')).toBe(false);
    logger.info('shared message');
    expect(lines).toEqual(['INFO    shared message']);
    setLogLevel('silly');
    expect(getLogLevel()).toBe('silly');
    logger.silly('shared trace');
    expect(lines).toContain('SILLY   shared trace');
    setLogLevel('silent');
    configureLogging({ stream: { write: () => undefined } });
  });
});
