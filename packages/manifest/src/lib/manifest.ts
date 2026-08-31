import { z } from 'zod';
import * as path from 'path';

export const RuntimeSchema = z.record(z.string());

export const PermissionsSchema = z.object({
  network: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional(),
  filesystem: z.boolean().optional().default(false),
});

const ConfigurationFieldSchema = z.object({
  type: z.enum(['string', 'url', 'number', 'boolean', 'secret']),
  label: z.string().optional(),
  required: z.boolean().optional().default(false),
});

export const ManifestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  version: z.string().min(1, 'Version is required'),
  description: z.string().optional(),
  entrypoint: z.string().min(1, 'Entrypoint is required'),
  runtime: RuntimeSchema.optional(),
  models: z.array(z.string()).optional(),
  permissions: PermissionsSchema.optional().default(() => ({
    filesystem: false,
  })),
  dependencies: z.record(z.string()).optional(),
  certification: z
    .object({
      required: z.enum(['S1', 'S2', 'S3', 'S4']).optional(),
    })
    .optional(),
  configuration: z.record(ConfigurationFieldSchema).optional(),
  risks: z.array(z.string()).optional(),
  hosts: z.array(z.string()).optional(),
});

export type Manifest = z.infer<typeof ManifestSchema>;

export function parseManifest(rawJson: unknown): Manifest {
  return ManifestSchema.parse(rawJson);
}

export function resolveEntrypoint(
  manifest: Manifest,
  skillPath: string,
): string {
  const root = path.resolve(skillPath);
  const entrypoint = path.resolve(root, manifest.entrypoint);
  if (!entrypoint.startsWith(`${root}${path.sep}`)) {
    throw new Error('Manifest entrypoint must stay inside the skill directory');
  }
  return entrypoint;
}

export function validateManifest(
  rawJson: unknown,
): { success: true; data: Manifest } | { success: false; error: z.ZodError } {
  const result = ManifestSchema.safeParse(rawJson);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}
