/** Shared endpoint state used by the client and headless transports. */
export const registryConfiguration = { api: '' };

/** Configure the shared endpoint without loading React hooks. */
export function configureRegistry(api: string): void {
  registryConfiguration.api = api;
}
