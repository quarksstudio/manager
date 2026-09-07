import type {
  ServerCertificationOptions,
  ServerCertificationResult,
} from './types';
export declare function requestServerCertification(
  options: ServerCertificationOptions,
): Promise<ServerCertificationResult>;
