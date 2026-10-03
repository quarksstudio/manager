import {
  createContext,
  createElement,
  useContext,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  useRegistryQuery,
  type RegistryQuery,
} from '@quarks.studio/use-storage/query';
import type {
  AuthSession,
  AuthStep,
  LoginOptions,
  StepListener,
} from './domain/auth-session';
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

const ServicesContext = createContext<IdentityServices | null>(null);
export function IdentityProvider({
  services,
  children,
}: {
  services: IdentityServices;
  children: ReactNode;
}) {
  return createElement(ServicesContext.Provider, { value: services }, children);
}
function useServices(override?: IdentityServices): IdentityServices {
  const services = useContext(ServicesContext);
  if (override) return override;
  if (!services) throw new Error('IdentityProvider is required');
  return services;
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

export function useAuthLogin(override?: IdentityServices): UseAuthLoginReturn {
  const { loginWithProvider, submitManualLoginCode } = useServices(override);
  const [currentStep, setCurrentStep] = useState<AuthStep>('idle');
  const [detailStep, setDetailStep] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<AuthSession['user'] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const authRequest = useRef(0);

  const login = useCallback(
    async (options: LoginOptions) => {
      const currentRequest = ++authRequest.current;
      setIsLoading(true);
      setError(null);
      try {
        const session = await loginWithProvider(
          options,
          (step, detaitls = '') => {
            if (currentRequest === authRequest.current) {
              setCurrentStep(step);
              setDetailStep(detaitls);
            }
          },
        );
        if (currentRequest === authRequest.current) setUser(session.user);
        return session;
      } catch (reason) {
        const failure =
          reason instanceof Error ? reason : new Error(String(reason));
        if (currentRequest === authRequest.current) setError(failure);
        throw failure;
      } finally {
        if (currentRequest === authRequest.current) setIsLoading(false);
      }
    },
    [loginWithProvider],
  );

  const submitManualCode = useCallback(
    async (code: string) => {
      submitManualLoginCode(code);
    },
    [submitManualLoginCode],
  );

  const reset = useCallback(() => {
    authRequest.current += 1;
    setCurrentStep('idle');
    setIsLoading(false);
    setUser(null);
    setError(null);
  }, []);

  return {
    login,
    submitManualCode,
    currentStep,
    detailStep,
    isLoading,
    isAuthenticated: currentStep === 'authenticated' && user !== null,
    user,
    error,
    reset,
  };
}

export function useCurrentUser<T = Record<string, unknown>>(
  override?: IdentityServices,
): RegistryQuery<T> {
  const client = useServices(override);
  const load = useCallback(async () => (await client.me()) as T, [client]);
  return useRegistryQuery(load);
}

export function useAuthLogout(override?: IdentityServices) {
  const client = useServices(override);
  const [status, setStatus] = useState<
    'idle' | 'running' | 'success' | 'error'
  >('idle');
  const [error, setError] = useState<Error | null>(null);
  const logout = useCallback(async () => {
    setStatus('running');
    setError(null);
    try {
      await client.logout();
      await client.clearSession();
      setStatus('success');
    } catch (reason) {
      const failure =
        reason instanceof Error ? reason : new Error(String(reason));
      setError(failure);
      setStatus('error');
      throw failure;
    }
  }, [client]);
  return { logout, status, error };
}
