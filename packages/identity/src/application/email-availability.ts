/** Result of checking whether an email can be linked to an account. */
export interface EmailAvailability {
  email: string;
  available: boolean;
}
