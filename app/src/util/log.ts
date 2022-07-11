import fs, { createWriteStream } from 'fs';
import AppDirectory from 'appdirectory';
import path from 'path';
import JSZip from 'jszip';
import { getHomePath, saveFile } from '../../ipc/ipc_renderer';
import { isRunningInTest } from './index';
import glob from 'glob';

enum LogLevel {
  Log,
  Trace,
  Debug,
  Info,
  Warn,
  Error,
  GroupCollapsed,
  GroupEnd,
}

export let logFilePath: string | null = null;
let oldLog: ((...args: any[]) => void) | null = null;

function log(file: number, level: LogLevel, ...args: any[]) {
  const date = new Date().toISOString();
  const level_str = LogLevel[level];
  const string_args = args.map((x) => x.toString());
  const log_line = JSON.stringify({ date, level: level_str, args: string_args });
  if (oldLog !== null) oldLog(log_line);
  fs.writeSync(file, log_line + '\n');
  fs.fsyncSync(file);
}

export function initLog(suffix: string): void {
  if (isRunningInTest()) {
    return;
  }
  if (logFilePath !== null) {
    throw new Error('Thou shalt not initialize logging twice');
  }
  const log_dir = new AppDirectory({
    appName: 'audapolis',
  }).userLogs();
  if (!fs.existsSync(log_dir)) {
    fs.mkdirSync(log_dir, { recursive: true });
  }
  const now = new Date();
  for (const oldLogfile of glob.sync(path.join(log_dir, `*_${suffix}.log`))) {
    if (now.getTime() - fs.statSync(oldLogfile).mtime.getTime() > 5 * 24 * 60 * 60 * 1000) {
      fs.rmSync(oldLogfile);
    }
  }
  const fileName = now.getTime().toString() + `_${suffix}.log`;
  logFilePath = path.join(log_dir, fileName);
  const file = fs.openSync(logFilePath, 'w');
  console.log('Init logging into', logFilePath);
  oldLog = console.log;
  console.log = (...args) => log(file, LogLevel.Log, ...args);
  console.trace = (...args) => log(file, LogLevel.Trace, ...args);
  console.debug = (...args) => log(file, LogLevel.Debug, ...args);
  console.info = (...args) => log(file, LogLevel.Info, ...args);
  console.warn = (...args) => log(file, LogLevel.Warn, ...args);
  console.error = (...args) => log(file, LogLevel.Error, ...args);
  const oldGroupCollaped = console.groupCollapsed;
  console.groupCollapsed = (...args) => {
    log(file, LogLevel.GroupCollapsed, ...args);
    oldGroupCollaped(...args);
  };
  const oldGroupEnd = console.groupEnd;
  console.groupEnd = (...args) => {
    log(file, LogLevel.GroupEnd, ...args);
    oldGroupEnd(...args);
  };
}

export async function exportDebugLogsToDisk(files: (string | null)[]): Promise<void> {
  console.log('Exporting logs');
  const zip = JSZip();

  for (const file of files.filter((x): x is string => x !== null)) {
    zip.file(path.basename(file), fs.readFileSync(file));
  }

  const savePath = await saveFile({
    title: 'Save log as...',
    properties: ['showOverwriteConfirmation', 'createDirectory'],
    filters: [
      { name: 'Zip files', extensions: ['zip'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    defaultPath: path.join(await getHomePath(), 'debug_log.zip'),
  }).then((x) => x.filePath);
  if (!savePath) return;

  await new Promise((resolve, reject) => {
    zip
      .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
      .pipe(createWriteStream(savePath))
      .on('finish', resolve)
      .on('error', reject);
  });
}
