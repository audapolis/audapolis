import { BrowserWindow, globalShortcut, Menu, MenuItemConstructorOptions, shell } from 'electron';
import { createWindow } from './index';
import { MenuItemConstructorOptionsIpc } from './types';
import { exportDebugLog, menuClick, openAbout } from '../ipc/ipc_main';

type ShortcutMap = Record<string, string>;
export const menuMap: Record<number, { menu: Menu; accelerators: ShortcutMap }> = {};

function onMac(
  mac: MenuItemConstructorOptions[],
  otherPlatforms: MenuItemConstructorOptions[] = []
): MenuItemConstructorOptions[] {
  return process.platform === 'darwin' ? mac : otherPlatforms;
}

export function setMenu(window: BrowserWindow, args: MenuItemConstructorOptionsIpc[]): void {
  const transformMenuTemplate = (
    x: MenuItemConstructorOptionsIpc[]
  ): [MenuItemConstructorOptions[], ShortcutMap] => {
    const accelerators: ShortcutMap = {};

    const transformMenuTemplateInner = (
      x: MenuItemConstructorOptionsIpc[]
    ): MenuItemConstructorOptions[] => {
      return x.map((x) => {
        if (x.accelerator && x.click) {
          accelerators[x.accelerator.toString()] = x.click.toString();
        }
        return {
          ...x,
          click: () => {
            x.click && menuClick(window, x.click);
          },
          registerAccelerator: false,
          submenu: x.submenu && transformMenuTemplateInner(x.submenu),
        };
      });
    };

    const template = transformMenuTemplateInner(x);
    return [template, accelerators];
  };

  const [templateInner, accelerators] = transformMenuTemplate(args);
  const template = [
    ...onMac([
      {
        role: 'appMenu',
      },
    ]),
    ...templateInner,
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        {
          label: window.isMaximized() ? 'Un-Maximize' : 'Maximize',
          click: async function () {
            if (window.isMaximized()) {
              window.unmaximize();
            } else {
              window.maximize();
            }
          },
        },
        { role: 'togglefullscreen' },
        ...onMac(
          [{ type: 'separator' }, { role: 'front' }, { role: 'close' }],
          [{ role: 'close' }]
        ),
        { type: 'separator' },
        { role: 'toggleDevTools', accelerator: 'CommandOrControl+Alt+I' },
        {
          label: 'New Window',
          click: function () {
            createWindow();
          },
          accelerator: 'CommandOrControl+N',
        },
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'About',
          click: () => openAbout(window),
        },
        {
          label: 'Export debug log',
          click: async () => await exportDebugLog(window),
        },
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://github.com/audapolis/audapolis');
          },
        },
      ],
    },
  ] as MenuItemConstructorOptions[];

  menuMap[window.id] = {
    menu: Menu.buildFromTemplate(template),
    accelerators,
  };
  applyMenu(window);
}

export function applyMenu(window: BrowserWindow): void {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow?.id == window.id) {
    const menu = menuMap[focusedWindow.id];
    Menu.setApplicationMenu(menu.menu);
    unregisterAccelerators();
    Object.entries(menu.accelerators).forEach(([accelerator, uuid]) => {
      globalShortcut.register(accelerator, () => {
        menuClick(window, uuid);
      });
    });
  }
}

export function unregisterAccelerators(): void {
  globalShortcut.unregisterAll();
}
