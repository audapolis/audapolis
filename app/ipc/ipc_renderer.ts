// this file is NOT executed in the main process but rather can be used in the renderer process
// it helps to not get the api wrong by adding a layer, that enforces type safety and keeping
// the sender and the receiver close together.

import {
  ipcRenderer,
  OpenDialogOptions,
  OpenDialogReturnValue,
  SaveDialogOptions,
  SaveDialogReturnValue,
} from 'electron';
import { MenuItemConstructorOptionsIpc, ServerInfo } from '../main_process/types';

export function saveFile(options: SaveDialogOptions): Promise<SaveDialogReturnValue> {
  return ipcRenderer.invoke('save-file', options);
}

export function openFile(options: OpenDialogOptions): Promise<OpenDialogReturnValue> {
  return ipcRenderer.invoke('open-file', options);
}

export function openTextInSystem(options: { name: string; text: string }): Promise<void> {
  return ipcRenderer.invoke('open-text-in-system', options);
}

export function getAbout(): Promise<{ version: string }> {
  return ipcRenderer.invoke('get-about');
}

export function getHomePath(): Promise<string> {
  return ipcRenderer.invoke('get-home-path');
}

export function setMenuBar(contents: MenuItemConstructorOptionsIpc[]): void {
  ipcRenderer.send('set-menubar', contents);
}

export function showMenuBar(): void {
  ipcRenderer.send('show-menubar');
}

export function subscribeMenuBarClick(callback: (uuid: string) => void): void {
  ipcRenderer.on('menubar-click', (e, payload) => {
    callback(payload);
  });
}

export function unsubscribeAllMenuBarClick(): void {
  ipcRenderer.removeAllListeners('menubar-click');
}

export function showContextMenu(contents: MenuItemConstructorOptionsIpc[]): void {
  ipcRenderer.send('show-contextmenu', contents);
}

export function subscribeContextMenuClick(callback: (uuid: string) => void): void {
  ipcRenderer.on('contextmenu-click', (e, payload) => {
    callback(payload);
  });
}

export function unsubscribeAllContextMenuClick(): void {
  ipcRenderer.removeAllListeners('contextmenu-click');
}

export function requestLocalServerInfo(): void {
  ipcRenderer.send('local-server-request');
}

export function subscribeLocalServerStderr(callback: (stderr: string) => void): void {
  ipcRenderer.on('local-server-stderr', (event, arg: string) => {
    callback(arg);
  });
}

export function subscribeLocalServerInfo(callback: (stderr: ServerInfo) => void): void {
  ipcRenderer.on('local-server-info', (event, arg: ServerInfo) => {
    callback(arg);
  });
}

export function subscribeOpenAbout(callback: () => void): void {
  ipcRenderer.on('open-about', callback);
}
