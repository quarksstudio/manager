export type CertificationTier = 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4';
export type AchievedTier = CertificationTier | 'FAILED';
export type TrustLevel = 'S1' | 'S2' | 'S3' | 'S4';
export interface CoverageReport {
  schemaCoverage: number;
  assertionCoverage: number;
  invariantCoverage: number;
  evaluatedPaths: string[];
  missingPaths: string[];
}
export interface CertificationResult {
  packageName: string;
  version: string;
  tierAchieved: AchievedTier;
  isCertified: boolean;
  sha256Hash: string;
  skillTrustLevel: TrustLevel | null;
  coverage: CoverageReport;
  durationMs: number;
  errors: string[];
  signature?: string;
  timestampToken?: string;
}
export interface SandboxRequest {
  command: string;
  cwd: string;
  input: unknown;
  timeoutMs: number;
  mockTime?: string;
  allowNetwork: boolean;
  httpMocks?: HttpMock[];
  toolMocks?: ToolMock[];
}
export interface SandboxResult {
  output: unknown;
  stdout: string;
  stderr: string;
  exitCode: number;
  events?: Array<{
    tool: string;
    args?: unknown;
  }>;
}
export interface SandboxAdapter {
  readonly name: string;
  readonly strongNetworkIsolation: boolean;
  execute(request: SandboxRequest): Promise<SandboxResult>;
}
export interface SchemaResolver {
  resolve(url: string): Promise<{
    document: unknown;
    sha256: string;
  }>;
}
export interface Signer {
  sign(payload: Buffer): Promise<{
    signature: string;
    keyId?: string;
  }>;
}
export interface TimestampProvider {
  timestamp(payloadHash: string): Promise<string>;
}
export interface PaymentVerifier {
  verify(tier: CertificationTier): Promise<{
    paymentId: string;
  }>;
}
export interface AuditorVerifier {
  verify(
    audit: unknown,
    payload: Buffer,
  ): Promise<{
    auditorSignature: string;
  }>;
}
export interface RunnerDependencies {
  sandbox?: SandboxAdapter;
  schemaResolver?: SchemaResolver;
  signer?: Signer;
  timestampProvider?: TimestampProvider;
  paymentVerifier?: PaymentVerifier;
  auditorVerifier?: AuditorVerifier;
  now?: () => Date;
  securityRunner?: SecurityRunner;
}
export interface TestRunnerOptions extends RunnerDependencies {
  targetDir: string;
  tierRequested: CertificationTier;
  seed?: number;
  forceIsolatedSandbox?: boolean;
}
export interface ServerCertificationOptions {
  serverUrl: string;
  packageId: string;
  versionId: string;
  productId: string;
  accessToken: string;
  wait?: boolean;
  pollIntervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}
export interface ServerCertificationLaunch {
  messageId: string;
  packageId: string;
  versionId: string;
  productId: string;
}
export interface ServerCertificationResult extends ServerCertificationLaunch {
  certification?: Record<string, unknown>;
}
export interface SecurityRunner {
  scan(targetDir: string, timeoutMs: number): Promise<string[]>;
}
export interface HttpMock {
  request: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url: string;
  };
  response: {
    status: number;
    body?: unknown;
  };
}
export interface ToolMock {
  tool: string;
  when_args?: Record<string, unknown>;
  returns?: Record<string, unknown>;
}
export interface EqualsAssertion {
  type: 'equals';
  path: string;
  value: unknown;
}
export interface RegexAssertion {
  type: 'regex';
  path: string;
  value: string;
}
export interface SchemaAssertion {
  type: 'schema';
  path: string;
  schema_file: string;
}
export interface FileCreatedAssertion {
  type: 'file_created';
  path: string;
  max_bytes: number;
  sha256: string;
}
export interface FileMatchAssertion {
  type: 'file_match';
  path: string;
  content_regex: string;
}
export interface TrajectoryAssertion {
  type: 'trajectory_sequence';
  steps: string[];
}
export interface MaxStepsAssertion {
  type: 'max_steps_not_exceeded';
  limit: number;
}
export type SkillAssertion =
  | EqualsAssertion
  | RegexAssertion
  | SchemaAssertion
  | FileCreatedAssertion
  | FileMatchAssertion;
export type AgentAssertion =
  RegexAssertion | TrajectoryAssertion | MaxStepsAssertion;
export interface SkillTestCase {
  id: string;
  description: string;
  input: {
    prompt: string;
    context?: Record<string, unknown>;
  };
  http_mocks?: HttpMock[];
  assertions: SkillAssertion[];
}
export interface PropertyTest {
  id: string;
  description: string;
  generator: Record<string, string>;
  invariant_assertions: Array<{
    expression: string;
  }>;
}
export interface SkillTestContract {
  version: '1.0';
  skill: string;
  environment: {
    allow_network: boolean;
    mock_time?: string;
    timeout_ms: number;
  };
  schema_contract?: {
    file?: string;
    url?: string;
  };
  tests: SkillTestCase[];
  property_tests: PropertyTest[];
}
export interface AgentTestContract {
  version: '1.0';
  agent: string;
  environment: {
    max_steps: number;
    allow_network: boolean;
    temperature: number;
    timeout_ms: number;
  };
  tests: Array<{
    id: string;
    description: string;
    input: {
      prompt: string;
    };
    tool_mocks?: ToolMock[];
    assertions: AgentAssertion[];
  }>;
}
export interface PackageManifest {
  name: string;
  version: string;
  description: string;
  runtime?: 'node' | 'python';
  testCommand: string;
  mapper_files?: Record<
    string,
    {
      agents?: Record<string, string>;
      tools?: Record<string, string>;
    }
  >;
  isCertified?: boolean;
}
