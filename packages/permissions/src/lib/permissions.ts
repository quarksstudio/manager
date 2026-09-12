import type { Manifest } from '@quark/manifest';
import { createInterface } from 'node:readline/promises';
import { PermissionPolicy } from '../domain';

export interface UserPolicy {
  allowedDomains?: string[];
  allowFilesystem?: boolean;
  allowedTools?: string[];
}

export interface PermissionCheckResult {
  granted: boolean;
  deniedPermissions: {
    network?: string[];
    tools?: string[];
    filesystem?: boolean;
  };
}

export function checkNetworkAccess(
  domain: string,
  policy: UserPolicy,
): boolean {
  return isDomainAllowed(domain, policy.allowedDomains || []);
}

export function checkFilesystemAccess(policy: UserPolicy): boolean {
  return policy.allowFilesystem === true;
}

export function checkToolAccess(tool: string, policy: UserPolicy): boolean {
  return isToolAllowed(tool, policy.allowedTools || []);
}

export function validatePermissions(
  manifest: Manifest,
  policy: UserPolicy,
): PermissionCheckResult {
  const reqPermissions = manifest.permissions || { filesystem: false };
  const decision = new PermissionPolicy({
    allowedDomains: policy.allowedDomains || [],
    allowedTools: policy.allowedTools || [],
    allowFilesystem: policy.allowFilesystem === true,
  }).evaluate({
    network: reqPermissions.network || [],
    tools: reqPermissions.tools || [],
    filesystem: reqPermissions.filesystem === true,
  });
  return { granted: decision.granted, deniedPermissions: decision.denied };
}

function isDomainAllowed(domain: string, allowedList: string[]): boolean {
  if (allowedList.includes('*')) return true;

  for (const pattern of allowedList) {
    if (pattern === domain) return true;
    if (pattern.startsWith('*.') && domain.endsWith(pattern.slice(1)))
      return true;
  }
  return false;
}

function isToolAllowed(tool: string, allowedList: string[]): boolean {
  if (allowedList.includes('*')) return true;

  for (const pattern of allowedList) {
    if (pattern === tool) return true;
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2);
      if (tool.startsWith(prefix + '.')) return true;
    }
  }
  return false;
}

export async function promptForPermissions(
  denied: PermissionCheckResult['deniedPermissions'],
): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return false;
  const requested = [
    ...(denied.network || []).map((value) => `network:${value}`),
    ...(denied.tools || []).map((value) => `tool:${value}`),
    ...(denied.filesystem ? ['filesystem'] : []),
  ];
  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const answer = await prompt.question(
      `Approve permissions [${requested.join(', ')}]? (y/N) `,
    );
    return (
      answer.trim().toLowerCase() === 'y' ||
      answer.trim().toLowerCase() === 'yes'
    );
  } finally {
    prompt.close();
  }
}
