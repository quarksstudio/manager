import { IdentityProvider } from '../presentation';
import { UserAvatarMenu } from './components/UserMenu/UserButton';
import { useIdentityServices } from '../hooks/useIdentityServices';
export function ConfiguredUserAvatarMenu() {
  const services = useIdentityServices();
  return (
    <IdentityProvider services={services}>
      <UserAvatarMenu />
    </IdentityProvider>
  );
}
