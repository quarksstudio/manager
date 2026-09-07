export interface SkillsManifest {
  name: string;
  version: string;
  description: string;
  files: Record<
    string,
    {
      agents: Record<string, string>;
    }
  >;
  dependencies: Record<string, string>;
}
export interface ValidatedManifest {
  manifest: SkillsManifest;
  sources: string[];
}
export declare function parseYaml<T = unknown>(content: string): T;
export declare function stringifyYaml(value: unknown): string;
export declare function validateSchema(manifestPath: string): Promise<boolean>;
export declare function readAndValidateManifest(
  manifestPath: string,
): Promise<ValidatedManifest>;
