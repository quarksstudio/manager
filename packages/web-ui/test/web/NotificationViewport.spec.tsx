import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NotificationViewport } from '../../src/components';
import { QuarkTheme } from '../../src/theme';

it.each(['success', 'error', 'info', 'warning'] as const)(
  'presents an Ant Design %s notification and dismisses it',
  async (level) => {
    const dismiss = jest.fn();
    render(
      <QuarkTheme>
        <NotificationViewport
          notifications={[
            { id: 7, level, title: 'Aviso', message: '<b>Texto</b>' },
          ]}
          onDismiss={dismiss}
        />
      </QuarkTheme>,
    );
    const notice = await screen.findByRole(
      level === 'error' ? 'alert' : 'status',
    );
    expect(notice.textContent).toContain('Aviso');
    expect(notice.className).toContain('ant-notification-notice');
    expect(notice.className).toContain(`ant-notification-notice-${level}`);
    expect(screen.getByText('<b>Texto</b>')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(dismiss).toHaveBeenCalledWith(7);
  },
);

it('does not duplicate notices on rerender and closes removed queue entries', async () => {
  const dismiss = jest.fn();
  const initial = [{ id: 1, level: 'info' as const, title: 'Primero' }];
  const { rerender } = render(
    <StrictMode>
      <NotificationViewport notifications={initial} onDismiss={dismiss} />
    </StrictMode>,
  );
  expect(await screen.findByText('Primero')).toBeTruthy();
  const next = [
    ...initial,
    { id: 2, level: 'error' as const, title: 'Segundo' },
  ];
  rerender(
    <StrictMode>
      <NotificationViewport notifications={next} onDismiss={dismiss} />
    </StrictMode>,
  );
  expect(await screen.findByText('Segundo')).toBeTruthy();
  expect(screen.getAllByText('Primero')).toHaveLength(1);
  rerender(
    <StrictMode>
      <NotificationViewport notifications={[next[1]]} onDismiss={dismiss} />
    </StrictMode>,
  );
  await waitFor(() => expect(screen.queryByText('Primero')).toBeNull());
  expect(screen.getByText('Segundo')).toBeTruthy();
});
