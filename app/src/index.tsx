import * as React from 'react';
import * as ReactDOM from 'react-dom';

import './index.css';

import App from './components/App';
import { exportDebugLogsToDisk, initLog, logFilePath } from './util/log';
import { subscribeExportDebugLog } from '../ipc/ipc_renderer';

initLog('renderer');
subscribeExportDebugLog((event, mainProcessLogPath) =>
  exportDebugLogsToDisk([logFilePath, mainProcessLogPath])
);

const anyModule = module as any;
if (anyModule.hot) {
  anyModule.hot.accept();
}

ReactDOM.render(<App />, document.getElementById('root'));
