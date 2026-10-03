export interface RegistryQuery<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
  refetch: () => void;
}
