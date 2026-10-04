const CHANNEL = 'quark:notifications:show';

function validMessage(message) {
  return (
    message &&
    typeof message === 'object' &&
    ['success', 'error', 'info', 'warning'].includes(message.level) &&
    typeof message.title === 'string' &&
    message.title.trim().length > 0 &&
    message.title.length <= 200 &&
    (message.message === undefined ||
      (typeof message.message === 'string' && message.message.length <= 2000))
  );
}

function registerNotifications({
  ipcMain,
  Notification,
  origin,
  getWindow,
  focusWindow,
}) {
  const active = new Set();
  ipcMain.handle(CHANNEL, async (event, message) => {
    const win = getWindow();
    if (
      !win ||
      event.sender !== win.webContents ||
      event.senderFrame !== win.webContents.mainFrame ||
      !validMessage(message)
    )
      return 'failed';
    try {
      if (new URL(event.senderFrame.url).origin !== origin) return 'failed';
      if (!Notification.isSupported()) return 'unavailable';
      return await new Promise((resolve) => {
        const notice = new Notification({
          title: message.title,
          body: message.message ?? '',
        });
        active.add(notice);
        let settled = false;
        const finish = (result) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(result);
        };
        const timer = setTimeout(() => {
          finish('failed');
          notice.close();
          active.delete(notice);
        }, 2000);
        notice.once('show', () => finish('shown'));
        notice.once('failed', () => {
          finish('failed');
          active.delete(notice);
        });
        notice.once('close', () => {
          finish('failed');
          active.delete(notice);
        });
        notice.on('click', focusWindow);
        try {
          notice.show();
        } catch {
          finish('failed');
          active.delete(notice);
        }
      });
    } catch {
      return 'failed';
    }
  });
  return () => {
    ipcMain.removeHandler(CHANNEL);
    for (const notice of active) notice.close();
    active.clear();
  };
}

module.exports = { CHANNEL, registerNotifications };
