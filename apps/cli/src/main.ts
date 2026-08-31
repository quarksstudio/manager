import { homedir } from 'os';
import { Command } from 'commander';
import * as Action from '@quark/actions';
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
  .option('--where <path>', 'installation destination', homedir())
  .option('-m, --models <models>', 'comma-separated model targets', ',')
  .action(Action.Add);

program
  .command('add')
  .description('Install a skill')
  .argument('<skill>', 'skill package name')
  .option('--where <path>', 'installation destination', homedir())
  .option('-m, --models <models>', 'comma-separated model targets', ',')
  .action(Action.Add);

const auth = program.command('auth').description('Manage authentication');

auth
  .command('login')
  .description('Sign in to Quark')
  .argument('[provider]', 'google, github, twitter or facebook')
  .option('-s, --strategy <strategy>', 'manual-code or local-server')
  .option('-p, --port <port>', 'local callback server port')
  .action((provider, options) => {
    Action.Auth.Login({
      provider,
      strategy: options.strategy,
      localServerPort: options.port ? Number(options.port) : undefined,
    });
  });

auth.command('me').description('Show the current user').action(Action.Auth.Me);
auth.command('logout').description('Sign out').action(Action.Auth.Logout);

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
      await Action.Publish(skill, {
        tier: options.tier,
        upload: !options.dryRun,
      });
    },
  );

program
  .command('remove')
  .description('Remove an installed skill')
  .argument('<skill>', 'skill package name')
  .option('--where <path>', 'installation destination', homedir())
  .option('-m, --models <models>', 'comma-separated model targets', ',')
  .action(Action.Remove);

program
  .command('search')
  .description('Search the Quark skill registry')
  .argument('<skill>', 'name or search query')
  .option('-m, --models <models>', 'comma-separated model targets', ',')
  .action(Action.Search);

const config = program.command('config').description('Manage the CLI config');

config
  .command('list')
  .description('List configuration values')
  .action(Action.Config.List);

config
  .command('set')
  .description('Set a configuration value')
  .argument('<name>', 'configuration key')
  .argument('<value>', 'configuration value')
  .action(Action.Config.Set);

config
  .command('get')
  .description('Get a configuration value')
  .argument('<name>', 'configuration key')
  .action(Action.Config.Get);

const cache = program
  .command('cache')
  .description('Manage the local skill cache');
cache
  .command('list')
  .description('List cached skill archives')
  .action(async () => {
    await Action.Cache.List();
  });
cache
  .command('verify')
  .description('Verify cached archive hashes')
  .action(async () => {
    await Action.Cache.Verify();
  });
cache
  .command('clean')
  .description('Remove all cached skill archives')
  .action(async () => {
    await Action.Cache.Clean();
  });

program.parse();
