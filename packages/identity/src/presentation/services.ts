import { createContext, createElement, type ReactNode } from 'react';
import type {
  AuthSession,
  AuthStep,
  LoginOptions,
  StepListener,
} from '../domain/auth-session';
export interface IdentityServices {
  loginWithProvider(
    options: LoginOptions,
    onStep?: StepListener,
  ): Promise<AuthSession>;
  submitManualLoginCode(code: string): void;
  me(): Promise<unknown>;
  logout(): Promise<unknown>;
  clearSession(): Promise<void>;
}
export const ServicesContext = createContext<IdentityServices | null>(null);
export function IdentityProvider({
  services,
  children,
}: {
  services: IdentityServices;
  children: ReactNode;
}) {
  return createElement(ServicesContext.Provider, { value: services }, children);
}
export interface UseAuthLoginReturn {
  login: (options: LoginOptions) => Promise<AuthSession>;
  submitManualCode: (code: string) => Promise<void>;
  currentStep: AuthStep;
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthSession['user'] | null;
  error: Error | null;
  reset: () => void;
  detailStep?: string;
}
