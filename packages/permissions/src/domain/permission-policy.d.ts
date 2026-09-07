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
  denied: {
    network?: string[];
    tools?: string[];
    filesystem?: boolean;
  };
}
export declare class PermissionPolicy {
  private readonly rules;
  constructor(rules: PolicyRules);
  evaluate(request: PermissionRequest): PermissionDecision;
}
