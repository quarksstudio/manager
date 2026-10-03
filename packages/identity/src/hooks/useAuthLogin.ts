import { useCallback, useRef, useState } from 'react';
import type {
  AuthSession,
  AuthProvider,
  AuthStep,
  LoginOptions,
  StepListener,
} from '../domain/auth-session';
import {
  type IdentityServices,
  type UseAuthLoginReturn,
} from '../presentation/services';
import { useServices } from './useServices';
export function useAuthLogin(override?: IdentityServices): UseAuthLoginReturn {
  const { loginWithProvider, loginWithLocalEmulator, submitManualLoginCode } =
    useServices(override);
  const [currentStep, setCurrentStep] = useState<AuthStep>('idle');
  const [detailStep, setDetailStep] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<AuthSession['user'] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const authRequest = useRef(0);

  const runLogin = useCallback(
    async (authenticate: (onStep: StepListener) => Promise<AuthSession>) => {
      const currentRequest = ++authRequest.current;
      setIsLoading(true);
      setError(null);
      try {
        const session = await authenticate((step, details = '') => {
          if (currentRequest === authRequest.current) {
            setCurrentStep(step);
            setDetailStep(details);
          }
        });
        if (currentRequest === authRequest.current) {
          setUser(session.user);
          setCurrentStep('authenticated');
        }
        return session;
      } catch (reason) {
        const failure =
          reason instanceof Error ? reason : new Error(String(reason));
        if (currentRequest === authRequest.current) {
          setError(failure);
          setCurrentStep('idle');
        }
        throw failure;
      } finally {
        if (currentRequest === authRequest.current) setIsLoading(false);
      }
    },
    [],
  );

  const pendingEmulator = useRef<Promise<AuthSession> | null>(null);
  const login = useCallback(
    (provider: AuthProvider, options?: Omit<LoginOptions, 'provider'>) => {
      if (provider !== 'emulator') {
        return runLogin((onStep) =>
          loginWithProvider({ ...options, provider }, onStep),
        );
      }
      if (pendingEmulator.current) return pendingEmulator.current;
      const request = runLogin((onStep) => {
        onStep('exchanging-token', 'Ingresando con emulador');
        return loginWithLocalEmulator();
      });
      pendingEmulator.current = request;
      const clear = () => {
        pendingEmulator.current = null;
      };
      void request.then(clear, clear);
      return request;
    },
    [runLogin, loginWithProvider, loginWithLocalEmulator],
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
