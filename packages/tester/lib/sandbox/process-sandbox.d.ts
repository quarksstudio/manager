import type { SandboxAdapter, SandboxRequest, SandboxResult } from '../types';
export declare class ProcessSandbox implements SandboxAdapter {
  readonly name = 'process';
  readonly strongNetworkIsolation = false;
  execute(request: SandboxRequest): Promise<SandboxResult>;
  private spawn;
}
