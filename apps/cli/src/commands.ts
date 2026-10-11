import { homedir } from 'os';
import { Command } from 'commander';
import { Add, Remove } from '@quarks.studio/installer/CLI';
import { Login, Logout, Me } from '@quarks.studio/identity/CLI';
import { Info } from '@quarks.studio/distribution/CLI';
import { Search } from '@quarks.studio/package-search/CLI';
import * as Config from '@quarks.studio/config/CLI';
import * as Cache from '@quarks.studio/storage/CLI';
import { Publish } from '@quarks.studio/publisher/CLI';
import { Test } from '@quarks.studio/tester/CLI';
import {
  parseCertificationTier,
  type CertificationTier,
} from '@quarks.studio/certification';

export function registerCommands(program: Command): void {
  program
    .name('quark')
    .description('Install, publish, and manage Quark skills')
    .version('1.0.0')
    .option(
      '--loglevel <level>',
      'log verbosity: silent, error, warn, notice, http, info, verbose, silly',
    )
    .option('--verbose', 'enable verbose logging (like --loglevel verbose)');

  program
    .command('add')
    .alias('install')
    .description('Install a skill')
    .argument('<skill>', 'skill package name')
    .option('--global', 'install for the current user')
    .option('--where <path>', 'installation destination', process.cwd())
    .option('-m, --models <models>', 'comma-separated model targets', ',')
    .action((skill, options) =>
      Add(skill, {
        ...options,
        where: options.global ? homedir() : options.where,
      }),
    );

  const auth = program.command('auth').description('Manage authentication');

  auth
    .command('login')
    .description('Sign in to Quark')
    .argument('[provider]', 'google, github, twitter or facebook')
    .option('-s, --strategy <strategy>', 'manual-code or local-server')
    .option('-p, --port <port>', 'local callback server port')
    .action((provider, options) =>
      Login({
        provider,
        strategy: options.strategy,
        localServerPort: options.port ? Number(options.port) : undefined,
      }),
    );

  auth.command('me').description('Show the current user').action(Me);
  auth.command('logout').description('Sign out').action(Logout);

  program
    .command('publish')
    .description('Verify, package, and publish a skill')
    .argument('<skill>', 'skill package directory')
    .option(
      '--tier <tier>',
      'local verification tier (TIER_1, TIER_2, TIER_3, or TIER_4)',
      parseCertificationTier,
      'TIER_1',
    )
    .option('--dry-run', 'generate the archive without uploading')
    .action(
      async (
        skill: string,
        options: { tier: CertificationTier; dryRun?: boolean },
      ) =>
        await Publish(skill, {
          tier: options.tier,
          upload: !options.dryRun,
        }),
    );

  program
    .command('info')
    .description('Show package information')
    .argument(
      '<skill>',
      'skill package name with optional version (e.g. name@1.0.0, name@cert, name@latest, name)',
    )
    .action(Info);

  program
    .command('test')
    .description('Run local tester against a skill or agent directory')
    .argument('[path]', 'directory to test', process.cwd())
    .option(
      '--tier <tier>',
      'verification tier (TIER_1, TIER_2, TIER_3, or TIER_4)',
      'TIER_1',
    )
    .option(
      '--seed <seed>',
      'deterministic test seed',
      (value) => Number(value),
      12345,
    )
    .option('--isolated', 'require strong sandbox isolation')
    .option('--json', 'print a machine-readable result')
    .action(
      (
        targetDir: string,
        options: {
          tier: string;
          seed: number;
          isolated?: boolean;
          json?: boolean;
        },
      ) => Test(targetDir, options),
    );

  program
    .command('remove')
    .alias('uninstall')
    .description('Remove an installed skill')
    .argument('<skill>', 'skill package name')
    .option('--global', 'remove from the current user installation')
    .option('--where <path>', 'installation destination', homedir())
    .option('-m, --models <models>', 'comma-separated model targets', ',')
    .action((skill, options) =>
      Remove(skill, options.global ? homedir() : options.where),
    );

  program
    .command('search')
    .alias('find')
    .description('Search one page of the Quark skill registry')
    .argument('[skill]', 'name or search query')
    .option(
      '--query <text>',
      'search text (takes precedence over --search and skill)',
    )
    .option(
      '--search <text>',
      'alias for --query (takes precedence over skill)',
    )
    .option('--author <uid>', 'filter by author UID')
    .option('--name <text>', 'filter by package name')
    .option('--summary <text>', 'filter by package description')
    .option('--tags <tags>', 'comma-separated tags')
    .option('--match-mode <mode>', 'tag match mode: any or all', 'any')
    .option(
      '--exact [boolean]',
      'exact matching: true or false; flag alone means true',
      false,
    )
    .option(
      '--limit <number>',
      'page size (positive integer; server maximum 100)',
    )
    .option('--cursor <cursor>', 'page cursor returned by a previous search')
    .option(
      '-m, --models <models>',
      'accepted for compatibility; does not filter registry search',
      ',',
    )
    .action(Search);

  const config = program.command('config').description('Manage the CLI config');

  config
    .command('list')
    .description('List configuration values')
    .action(Config.List);

  config
    .command('set')
    .description('Set a configuration value')
    .argument('<name>', 'configuration key')
    .argument('<value>', 'configuration value')
    .action(Config.Set);

  config
    .command('get')
    .description('Get a configuration value')
    .argument('<name>', 'configuration key')
    .action(Config.Get);

  const cache = program
    .command('cache')
    .description('Manage the local skill cache');
  cache
    .command('list')
    .description('List cached skill archives')
    .action(Cache.List);

  cache
    .command('verify')
    .description('Verify cached archive hashes')
    .action(Cache.Verify);

  cache
    .command('clean')
    .description('Remove all cached skill archives')
    .action(Cache.Clean);
}
