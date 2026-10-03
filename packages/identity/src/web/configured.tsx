import { currentEnv } from '@quarks.studio/config';
import { IdentityProvider } from '../presentation';
import { UserAvatarMenu } from './UserButton';
import { useIdentityServices } from '../hooks/useIdentityServices';
export function ConfiguredUserAvatarMenu() {
  const services = useIdentityServices();
  return (
    <IdentityProvider services={services}>
      <UserAvatarMenu environment={currentEnv()['QUARK_ENV']} />
    </IdentityProvider>
  );
}
