#!/usr/bin/env node
import { runAgentTests, runSkillTests } from './lib/runner';
import { requestServerCertification } from './lib/server-client';
import { parseCertificationTier, type TestRunnerOptions } from './lib/types';

async function main(argv: string[]): Promise<number> {
  const [command, targetDir, ...rest] = argv;
  if (
    !command ||
    !targetDir ||
    !['skill', 'agent', 'server'].includes(command)
  ) {
    process.stderr.write(
      'Usage: quark-tester <skill|agent> <targetDir> [--tier TIER_1..TIER_4] [--seed number] [--isolated]\n       quark-tester server <packageId> --server URL --version VERSION --product PRODUCT [--wait]\n',
    );
    return 2;
  }
  if (command === 'server') {
    const serverUrl = requiredOption(rest, '--server');
    const versionId = requiredOption(rest, '--version');
    const productId = requiredOption(rest, '--product');
    const accessToken = process.env['MANAGER_SERVER_TOKEN'];
    if (!accessToken) throw new Error('MANAGER_SERVER_TOKEN is not configured');
    const result = await requestServerCertification({
      serverUrl,
      packageId: targetDir,
      versionId,
      productId,
      accessToken,
      wait: rest.includes('--wait'),
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  }
  const tier = parseCertificationTier(option(rest, '--tier') ?? 'TIER_1');
  const seedText = option(rest, '--seed');
  const seed = seedText === undefined ? 12345 : Number(seedText);
  if (!Number.isSafeInteger(seed)) throw new Error(`Invalid seed: ${seedText}`);
  const options: TestRunnerOptions = {
    targetDir,
    tierRequested: tier,
    seed,
    forceIsolatedSandbox: rest.includes('--isolated'),
  };
  const result =
    command === 'skill'
      ? await runSkillTests(options)
      : await runAgentTests(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result.errors.length ? 1 : 0;
}

function requiredOption(args: string[], name: string): string {
  const value = option(args, name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  if (!args[index + 1]) throw new Error(`Missing value for ${name}`);
  return args[index + 1];
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 2;
  });
