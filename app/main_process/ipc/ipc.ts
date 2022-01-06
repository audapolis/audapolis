import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { assertSome } from '../../src/util';
import path from 'path';
import fs from 'fs';
import { menuMap, setMenu } from '../menu';
import { sendAll } from './windowList';
import { serverInfo } from '../server';
import { ServerInfo } from '../types';

ipcMain.handle('open-file', (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  assertSome(win);
  return dialog.showOpenDialog(win, options);
});

ipcMain.handle('save-file', (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  assertSome(win);
  return dialog.showSaveDialog(win, options);
});

ipcMain.handle('open-text-in-system', (event, options) => {
  const tempdir = app.getPath('temp');
  const filepath = path.join(tempdir, options.name);
  fs.writeFileSync(filepath, options.text);
  shell.openPath(filepath);
});

ipcMain.handle('get-about', () => {
  return {
    version: app.getVersion(),
  };
});

ipcMain.on('set-menu', (event, args) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  assertSome(win);
  setMenu(win, args);
});

ipcMain.on('show-menu', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  assertSome(win);
  menuMap[win.id].menu.popup({
    x: 0,
    y: 55,
  });
});

export function publishServerInfo(update?: Partial<ServerInfo>): void {
  if (update) {
    Object.keys(update).forEach((k: keyof typeof update) => {
      (serverInfo[k] as any) = update[k];
    });
  }
  sendAll('local-server-info', serverInfo);
}

export function publishServerStderr(stderr: string): void {
  sendAll('local-server-stderr', stderr);
}

ipcMain.on('local-server-request', () => {
  publishServerInfo();
});

export function openAbout(window: BrowserWindow): void {
  window.webContents.send('open-about');
}
