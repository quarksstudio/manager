import { ProvadierName } from '@quark/types/client';
export declare function me(this: any): Promise<any>;
export declare function logout(this: any): Promise<any>;
export declare function getUrlLogin(
  this: any,
  providerId: ProvadierName,
  continueUri: string,
): Promise<string>;
