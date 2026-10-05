import { fireEvent, render, screen } from '@testing-library/react';
import { ConfiguredUserAvatarMenu } from '../../src/web/configured/ConfiguredUserAvatarMenu';

const keys = ['QUARKS_ENV', 'QUARK_ENV'] as const;
const original = keys.map((key) => process.env[key]);

beforeEach(() => keys.forEach((key) => delete process.env[key]));
afterEach(() => {
  keys.forEach((key, index) => {
    if (original[index] === undefined) delete process.env[key];
    else process.env[key] = original[index];
  });
});

it('uses QUARKS_ENV to show the emulator in the configured Web menu', async () => {
  process.env.QUARKS_ENV = 'local';
  render(<ConfiguredUserAvatarMenu />);
  fireEvent.click(await screen.findByText('Login'));
  expect(await screen.findByText('Ingresar con emulador')).toBeTruthy();
});

it('does not show the emulator for the removed environment name', async () => {
  process.env.QUARK_ENV = 'local';
  render(<ConfiguredUserAvatarMenu />);
  fireEvent.click(await screen.findByText('Login'));
  expect(await screen.findByText('Continuar con Google')).toBeTruthy();
  expect(screen.queryByText('Ingresar con emulador')).toBeNull();
});
