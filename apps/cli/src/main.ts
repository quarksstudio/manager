import { homedir } from 'os';
import { Command } from 'commander';
import { Add, Remove } from '@quark/installer/CLI';
import { Search, Info, Login, Logout, Me } from '@quark/registry/CLI';
import * as Config from '@quark/config/CLI';
import * as Cache from '@quark/local-store/CLI';
import { Publish } from '@quark/publisher/CLI';
import { Test } from '@quark/tester/CLI';
import { parseCertificationTier, type CertificationTier } from '@quark/tester';

const program = new Command();

program
  .name('quark')
  .description('Install, publish, and manage Quark skills')
  .version('1.0.0');

program
  .command('install')
  .description('Install a skill')
  .argument('[skill]', 'skill package name')
  .option('--global', 'install for the current user')
  .option('--where <path>', 'installation destination', homedir())
  .option('-m, --models <models>', 'comma-separated model targets', ',')
  .action(Add);

program
  .command('add')
  .description('Install a skill')
  .argument('<skill>', 'skill package name')
  .option('--global', 'install for the current user')
  .option('--where <path>', 'installation destination', homedir())
  .option('-m, --models <models>', 'comma-separated model targets', ',')
  .action(Add);

const auth = program.command('auth').description('Manage authentication');

auth
  .command('login')
  .description('Sign in to Quark')
  .argument('[provider]', 'google, github, twitter or facebook')
  .option('-s, --strategy <strategy>', 'manual-code or local-server')
  .option('-p, --port <port>', 'local callback server port')
  .action((provider, options) => {
    Login({
      provider,
      strategy: options.strategy,
      localServerPort: options.port ? Number(options.port) : undefined,
    });
  });

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
    ) => {
      await Publish(skill, {
        tier: options.tier,
        upload: !options.dryRun,
      });
    },
  );

program
  .command('info')
  .description('Show package information')
  .argument('<skill>', 'skill package name')
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
    ) => {
      Test(targetDir, options);
    },
  );

program
  .command('remove')
  .description('Remove an installed skill')
  .argument('<skill>', 'skill package name')
  .option('--global', 'remove from the current user installation')
  .option('--where <path>', 'installation destination', homedir())
  .option('-m, --models <models>', 'comma-separated model targets', ',')
  .action((skill, options) =>
    Remove(skill, options.global ? homedir() : options.where),
  );

program
  .command('uninstall')
  .description('Remove an installed skill')
  .argument('<skill>', 'skill package name')
  .option('--global', 'remove from the current user installation')
  .option('--where <path>', 'installation destination', homedir())
  .action((skill, options) =>
    Remove(skill, options.global ? homedir() : options.where),
  );

program
  .command('search')
  .description('Search the Quark skill registry')
  .argument('<skill>', 'name or search query')
  .option('-m, --models <models>', 'comma-separated model targets', ',')
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
  .action(async () => {
    await Cache.List();
  });
cache
  .command('verify')
  .description('Verify cached archive hashes')
  .action(async () => {
    await Cache.Verify();
  });
cache
  .command('clean')
  .description('Remove all cached skill archives')
  .action(async () => {
    await Cache.Clean();
  });

program.parse();
