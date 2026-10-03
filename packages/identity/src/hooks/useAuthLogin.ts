import { useCallback, useRef, useState } from 'react';
import type {
  AuthSession,
  AuthStep,
  LoginOptions,
} from '../domain/auth-session';
import {
  type IdentityServices,
  type UseAuthLoginReturn,
} from '../presentation/services';
import { useServices } from './useServices';
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
