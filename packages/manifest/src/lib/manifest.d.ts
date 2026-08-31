import { z } from 'zod';
export declare const RuntimeSchema: z.ZodRecord<z.ZodString, z.ZodString>;
export declare const PermissionsSchema: z.ZodObject<{
    network: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    tools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    filesystem: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    filesystem: boolean;
    network?: string[] | undefined;
    tools?: string[] | undefined;
}, {
    network?: string[] | undefined;
    tools?: string[] | undefined;
    filesystem?: boolean | undefined;
}>;
export declare const ManifestSchema: z.ZodObject<{
    name: z.ZodString;
    version: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    entrypoint: z.ZodString;
    runtime: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    models: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    permissions: z.ZodDefault<z.ZodOptional<z.ZodObject<{
        network: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        tools: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        filesystem: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        filesystem: boolean;
        network?: string[] | undefined;
        tools?: string[] | undefined;
    }, {
        network?: string[] | undefined;
        tools?: string[] | undefined;
        filesystem?: boolean | undefined;
    }>>>;
    dependencies: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    certification: z.ZodOptional<z.ZodObject<{
        required: z.ZodOptional<z.ZodEnum<["S1", "S2", "S3", "S4"]>>;
    }, "strip", z.ZodTypeAny, {
        required?: "S1" | "S2" | "S3" | "S4" | undefined;
    }, {
        required?: "S1" | "S2" | "S3" | "S4" | undefined;
    }>>;
    configuration: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        type: z.ZodEnum<["string", "url", "number", "boolean", "secret"]>;
        label: z.ZodOptional<z.ZodString>;
        required: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        type: "string" | "number" | "boolean" | "url" | "secret";
        required: boolean;
        label?: string | undefined;
    }, {
        type: "string" | "number" | "boolean" | "url" | "secret";
        label?: string | undefined;
        required?: boolean | undefined;
    }>>>;
    risks: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    hosts: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    version: string;
    entrypoint: string;
    permissions: {
        filesystem: boolean;
        network?: string[] | undefined;
        tools?: string[] | undefined;
    };
    description?: string | undefined;
    runtime?: Record<string, string> | undefined;
    models?: string[] | undefined;
    dependencies?: Record<string, string> | undefined;
    certification?: {
        required?: "S1" | "S2" | "S3" | "S4" | undefined;
    } | undefined;
    configuration?: Record<string, {
        type: "string" | "number" | "boolean" | "url" | "secret";
        required: boolean;
        label?: string | undefined;
    }> | undefined;
    risks?: string[] | undefined;
    hosts?: string[] | undefined;
}, {
    name: string;
    version: string;
    entrypoint: string;
    description?: string | undefined;
    runtime?: Record<string, string> | undefined;
    models?: string[] | undefined;
    permissions?: {
        network?: string[] | undefined;
        tools?: string[] | undefined;
        filesystem?: boolean | undefined;
    } | undefined;
    dependencies?: Record<string, string> | undefined;
    certification?: {
        required?: "S1" | "S2" | "S3" | "S4" | undefined;
    } | undefined;
    configuration?: Record<string, {
        type: "string" | "number" | "boolean" | "url" | "secret";
        label?: string | undefined;
        required?: boolean | undefined;
    }> | undefined;
    risks?: string[] | undefined;
    hosts?: string[] | undefined;
}>;
export type Manifest = z.infer<typeof ManifestSchema>;
export declare function parseManifest(rawJson: unknown): Manifest;
export declare function resolveEntrypoint(manifest: Manifest, skillPath: string): string;
export declare function validateManifest(rawJson: unknown): {
    success: true;
    data: Manifest;
} | {
    success: false;
    error: z.ZodError;
};
