# Notifications

Transient application notifications. Domain and application exports are host independent.

React consumers import `useNotifications` from `@quarks.studio/notifications/hooks` and call `notify({ level, title, message? })`.
Mount `NotificationHost` from `@quarks.studio/notifications/web` once in the browser layout.
Independent React roots share a browser-scoped runtime; server rendering has no notification state.

Electron prefers native delivery through its isolated preload bridge, with visual fallback on unsupported or failed delivery. OS suppression such as Do Not Disturb cannot be detected reliably.
The Web presenter uses Ant Design `notification.useNotification` inside the shared theme.
Visual success/info/warning notices close after five seconds of presentation; errors require dismissal. Notifications have no persistent history.
