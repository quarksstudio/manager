export interface PermissionRequest {
  network: readonly string[];
  tools: readonly string[];
  filesystem: boolean;
}
export interface PolicyRules {
  allowedDomains: readonly string[];
  allowedTools: readonly string[];
  allowFilesystem: boolean;
}
export interface PermissionDecision {
  granted: boolean;
  denied: { network?: string[]; tools?: string[]; filesystem?: boolean };
}

export class PermissionPolicy {
  constructor(private readonly rules: PolicyRules) {}
  evaluate(request: PermissionRequest): PermissionDecision {
    const denied: PermissionDecision['denied'] = {};
    const network = request.network.filter(
      (item) => !matches(item, this.rules.allowedDomains, '*.'),
    );
    const tools = request.tools.filter(
      (item) => !matches(item, this.rules.allowedTools, '.*'),
    );
    if (network.length) denied.network = network;
    if (tools.length) denied.tools = tools;
    if (request.filesystem && !this.rules.allowFilesystem)
      denied.filesystem = true;
    return { granted: Object.keys(denied).length === 0, denied };
  }
}

function matches(
  value: string,
  patterns: readonly string[],
  wildcard: '*.' | '.*',
): boolean {
  if (patterns.includes('*') || patterns.includes(value)) return true;
  return patterns.some((pattern) =>
    wildcard === '*.'
      ? pattern.startsWith('*.') && value.endsWith(pattern.slice(1))
      : pattern.endsWith('.*') && value.startsWith(`${pattern.slice(0, -2)}.`),
  );
}
