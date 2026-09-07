import type {
  AgentTestContract,
  PackageManifest,
  SkillTestContract,
} from './types';
export declare function readYaml(file: string): Promise<unknown>;
export declare function readSkillContract(
  root: string,
): Promise<SkillTestContract>;
export declare function readAgentContract(
  root: string,
): Promise<AgentTestContract>;
export declare function readManifest(
  root: string,
  filename?: string,
): Promise<PackageManifest>;
