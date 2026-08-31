import { promises as fs } from 'fs';
import * as path from 'path';

import {
  runAgentTests,
  runSkillTests,
  type CertificationTier,
  type VerificationResult,
} from '@quark/tester';
import { Client } from '@quark/registry';
import { pack, parseYaml, stringifyYaml } from '@quark/targz';

export interface PublishOptions {
  tier?: CertificationTier;
  outputDir?: string;
  token?: string;
  upload?: boolean;
}

export interface PublishResult {
  archive: string;
  verification: VerificationResult;
  uploaded: boolean;
}

export default async function Publish(
  sourceDir = process.cwd(),
  options: PublishOptions = {},
): Promise<PublishResult> {
  const root = path.resolve(sourceDir);
  const tierRequested = options.tier ?? 'TIER_1';
  const isAgent = await exists(path.join(root, 'agent.test.yml'));
  const verification = isAgent
    ? await runAgentTests({ targetDir: root, tierRequested })
    : await runSkillTests({ targetDir: root, tierRequested });
  process.stdout.write(`${JSON.stringify(verification, null, 2)}\n`);
  if (!verification.passed)
    throw new Error(
      `Local verification failed: ${verification.errors.join('; ')}`,
    );

  const manifestFile = path.join(root, isAgent ? 'agent.yml' : 'skill.yml');
  const manifest = parseYaml<Record<string, unknown>>(
    await fs.readFile(manifestFile, 'utf8'),
  );
  const snapshot = {
    lockfileVersion: 1,
    integrity: `sha256-${verification.sha256Hash}`,
    isCertified: false,
    generatedAt: new Date().toISOString(),
    localVerification: verification,
    dependencies: manifest['dependencies'] ?? {},
  };
  await atomicWrite(
    path.join(root, isAgent ? 'agent.lock.yml' : 'skill.lock.yml'),
    stringifyYaml(snapshot),
  );
  const archive = await pack(root, options.outputDir ?? process.cwd());
  const uploaded = options.upload !== false;
  if (uploaded)
    await uploadArchive(archive, verification, manifest, options.token);
  return { archive, verification, uploaded };
}

async function uploadArchive(
  archive: string,
  verification: VerificationResult,
  manifest: Record<string, unknown>,
  explicitToken?: string,
): Promise<void> {
  const token = explicitToken ?? process.env['MANAGER_SERVER_TOKEN'];
  if (!token) throw new Error('MANAGER_SERVER_TOKEN is not configured');
  if (!Client.API) throw new Error('Registry API is not configured');
  const data = await fs.readFile(archive);
  const base = `${Client.API.replace(/\/$/, '')}/package/${encodeURIComponent(verification.packageName)}`;
  let response = await fetch(
    `${base}/${encodeURIComponent(verification.version)}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: uploadBody(data, archive, manifest, verification),
    },
  );
  if (response.status === 404 && verification.version === '1.0.0') {
    response = await fetch(base, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: uploadBody(data, archive, manifest, verification),
    });
  }
  if (!response.ok)
    throw new Error(
      `Package upload failed (${response.status}): ${await response.text()}`,
    );
}

function uploadBody(
  data: Buffer,
  archive: string,
  manifest: Record<string, unknown>,
  verification: VerificationResult,
): FormData {
  const body = new FormData();
  body.append(
    'file',
    new Blob([new Uint8Array(data).buffer]),
    path.basename(archive),
  );
  body.append(
    'description',
    String(manifest['description'] ?? verification.packageName),
  );
  return body;
}

async function atomicWrite(file: string, content: string): Promise<void> {
  const temporary = `${file}.${process.pid}-${Date.now()}.tmp`;
  await fs.writeFile(temporary, content, { flag: 'wx', mode: 0o600 });
  await fs.rename(temporary, file);
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
