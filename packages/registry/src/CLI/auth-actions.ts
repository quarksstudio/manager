import { Login as LoginCommand } from '@quarks.studio/identity/CLI';
import { Logout as LogoutCommand } from '@quarks.studio/identity/CLI';
import { Me as MeCommand } from '@quarks.studio/identity/CLI';
import { createPresentationServices } from '../composition/presentation-services';
import type { LoginScreenProps } from '@quarks.studio/identity/CLI';
export async function Login(props: LoginScreenProps): Promise<void> {
  LoginCommand(props, createPresentationServices().identity);
}
export async function Logout(): Promise<void> {
  LogoutCommand(createPresentationServices().identity);
}
export async function Me(): Promise<void> {
  MeCommand(createPresentationServices().identity);
}
