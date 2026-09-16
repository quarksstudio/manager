import { ProviderName } from '@quarks.studio/types/client';
export declare function me(this: any): Promise<any>;
export declare function logout(this: any): Promise<any>;
export declare function getUrlLogin(
  this: any,
  providerId: ProviderName,
  continueUri: string,
): Promise<string>;
