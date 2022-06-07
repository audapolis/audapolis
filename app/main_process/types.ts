import { MenuItemConstructorOptions } from 'electron';

export interface PatchType {
  click?: string;
  submenu?: MenuItemConstructorOptionsIpc[];
}
export type MenuItemConstructorOptionsIpc = Omit<
  Omit<MenuItemConstructorOptions, 'click'>,
  'submenu'
> &
  PatchType;

export interface ServerInfo {
  port: null | number;
  token: null | string;
  state: string;
}
