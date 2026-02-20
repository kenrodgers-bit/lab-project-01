const path = require('path');
const fs = require('fs');
const os = require('os');
const net = require('net');
const http = require('http');
const { app, BrowserWindow, shell, dialog, ipcMain } = require('electron');

const APP_PORT = Number(process.env.APP_PORT || 5000);
const APP_HOST = '0.0.0.0';

let controlWindow = null;
let wizardWindow = null;
let backendApi = null;
let shuttingDown = false;
let logFilePath = '';

let wizardResolveConfig = null;
let wizardRejectConfig = null;
let wizardSubmitCompleted = false;
let wizardInitialConfig = null;

function appRoot() {
  return path.resolve(__dirname, '..');
}

function runtimeConfigPath() {
  return path.join(app.getPath('userData'), 'runtime-config.json');
}

function getLocalIPv4() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const entries = interfaces[name] || [];
    for (const entry of entries) {
      if (entry && entry.family === 'IPv4' && !entry.internal) {
        return entry.address;
      }
    }
  }
  return null;
}

function localhostUrl() {
  return `http://localhost:${APP_PORT}`;
}

function lanUrl() {
  const ip = getLocalIPv4();
  if (!ip) return null;
  return `http://${ip}:${APP_PORT}`;
}

function initLogging() {
  const logsDir = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(logsDir, { recursive: true });
  logFilePath = path.join(logsDir, 'desktop.log');
}

function toErrorString(error) {
  if (!error) return 'Unknown error';
  if (error.stack) return error.stack;
  if (error.message) return error.message;
  return String(error);
}

function writeLog(message, error) {
  const line = `[${new Date().toISOString()}] ${message}${
    error ? ` | ${toErrorString(error)}` : ''
  }\n`;
  if (logFilePath) {
    fs.appendFileSync(logFilePath, line, 'utf8');
  }
  process.stdout.write(line);
}

function ensurePortAvailable(port, host) {
  return new Promise((resolve, reject) => {
    const tester = net.createServer();
    tester.once('error', (error) => {
      if (error && error.code === 'EADDRINUSE') {
        return resolve(false);
      }
      return reject(error);
    });
    tester.once('listening', () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, host);
  });
}

function waitForServerReady(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get(`${url}/health`, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) {
          return resolve();
        }
        if (Date.now() >= deadline) {
          return reject(new Error(`Server health check failed (${response.statusCode}).`));
        }
        return setTimeout(attempt, 300);
      });
      request.on('error', () => {
        if (Date.now() >= deadline) {
          return reject(new Error('Server did not become ready in time.'));
        }
        return setTimeout(attempt, 300);
      });
      request.setTimeout(2500, () => {
        request.destroy();
      });
    };
    attempt();
  });
}

function normalizeRuntimeConfig(raw = {}) {
  return {
    databaseUrl: String(raw.databaseUrl || '').trim(),
    jwtSecret: String(raw.jwtSecret || '').trim(),
    jwtExpiresIn: String(raw.jwtExpiresIn || '8h').trim() || '8h',
  };
}

function validateRuntimeConfig(rawConfig) {
  const config = normalizeRuntimeConfig(rawConfig);
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required.');
  }
  if (
    !config.databaseUrl.startsWith('postgres://') &&
    !config.databaseUrl.startsWith('postgresql://')
  ) {
    throw new Error('DATABASE_URL must start with postgres:// or postgresql://');
  }
  if (!config.jwtSecret || config.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters.');
  }
  return config;
}

function readRuntimeConfigFile() {
  const configPath = runtimeConfigPath();
  if (!fs.existsSync(configPath)) {
    return null;
  }
  const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return validateRuntimeConfig(raw);
}

function saveRuntimeConfigFile(rawConfig) {
  const config = validateRuntimeConfig(rawConfig);
  const configPath = runtimeConfigPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  return config;
}

function applyRuntimeConfig(config) {
  process.env.DATABASE_URL = config.databaseUrl;
  process.env.JWT_SECRET = config.jwtSecret;
  process.env.JWT_EXPIRES_IN = config.jwtExpiresIn;
}

function getInitialWizardConfig() {
  if (wizardInitialConfig) {
    return wizardInitialConfig;
  }
  try {
    const fileConfig = readRuntimeConfigFile();
    if (fileConfig) return fileConfig;
  } catch (error) {
    writeLog('Saved runtime config could not be read. Wizard will request new values.', error);
  }
  return normalizeRuntimeConfig({
    databaseUrl: process.env.DATABASE_URL || '',
    jwtSecret: process.env.JWT_SECRET || '',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

function configureBackendEnv() {
  process.env.PORT = String(APP_PORT);
  process.env.HOST = APP_HOST;

  if (!process.env.CORS_ORIGIN) {
    const origins = [`http://localhost:${APP_PORT}`, `http://127.0.0.1:${APP_PORT}`];
    const localIp = getLocalIPv4();
    if (localIp) {
      origins.push(`http://${localIp}:${APP_PORT}`);
    }
    process.env.CORS_ORIGIN = origins.join(',');
  }
}

function createControlWindow() {
  controlWindow = new BrowserWindow({
    width: 480,
    height: 360,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  controlWindow.loadFile(path.join(__dirname, 'control.html'));
  controlWindow.on('closed', () => {
    controlWindow = null;
  });
}

function createWizardWindow() {
  wizardWindow = new BrowserWindow({
    width: 640,
    height: 520,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  wizardWindow.loadFile(path.join(__dirname, 'wizard.html'));
  wizardWindow.on('closed', () => {
    wizardWindow = null;
    if (!wizardSubmitCompleted && wizardRejectConfig) {
      const reject = wizardRejectConfig;
      wizardResolveConfig = null;
      wizardRejectConfig = null;
      wizardInitialConfig = null;
      reject(new Error('Configuration wizard was cancelled.'));
    }
  });
}

function openConfigWizard(initialConfig) {
  wizardInitialConfig = normalizeRuntimeConfig(initialConfig || {});
  wizardSubmitCompleted = false;
  return new Promise((resolve, reject) => {
    wizardResolveConfig = resolve;
    wizardRejectConfig = reject;
    createWizardWindow();
  });
}

async function ensureRuntimeConfig() {
  try {
    if (process.env.DATABASE_URL && process.env.JWT_SECRET) {
      return validateRuntimeConfig({
        databaseUrl: process.env.DATABASE_URL,
        jwtSecret: process.env.JWT_SECRET,
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
      });
    }
  } catch (error) {
    writeLog('Environment runtime config is invalid. Falling back to wizard.', error);
  }

  try {
    const fileConfig = readRuntimeConfigFile();
    if (fileConfig) {
      return fileConfig;
    }
  } catch (error) {
    writeLog('Saved runtime config is invalid. Wizard required.', error);
  }

  return openConfigWizard(getInitialWizardConfig());
}

async function startBackend() {
  configureBackendEnv();
  const serverPath = path.join(appRoot(), 'server', 'src', 'index.js');
  const api = require(serverPath);
  if (typeof api.startServer !== 'function') {
    throw new Error('Backend startServer export is missing.');
  }
  await api.startServer({ port: APP_PORT, host: APP_HOST });
  backendApi = api;
}

async function stopBackend() {
  if (!backendApi || typeof backendApi.stopServer !== 'function') return;
  await backendApi.stopServer();
  backendApi = null;
}

function registerIpc() {
  ipcMain.handle('desktop:get-status', () => {
    const local = localhostUrl();
    const lan = lanUrl();
    return {
      port: APP_PORT,
      localUrl: local,
      lanUrl: lan,
      autostart: app.getLoginItemSettings().openAtLogin,
      logFilePath,
    };
  });

  ipcMain.handle('desktop:open-local', async () => {
    await shell.openExternal(localhostUrl());
  });

  ipcMain.handle('desktop:open-lan', async () => {
    const url = lanUrl();
    if (url) await shell.openExternal(url);
  });

  ipcMain.handle('desktop:set-autostart', (_event, enabled) => {
    app.setLoginItemSettings({ openAtLogin: Boolean(enabled) });
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle('desktop:quit', () => {
    app.quit();
  });

  ipcMain.handle('desktop:config:get', () => {
    const initial = getInitialWizardConfig();
    return {
      databaseUrl: initial.databaseUrl,
      jwtSecret: initial.jwtSecret,
      jwtExpiresIn: initial.jwtExpiresIn,
      configPath: runtimeConfigPath(),
    };
  });

  ipcMain.handle('desktop:config:save', (_event, rawConfig) => {
    try {
      const saved = saveRuntimeConfigFile(rawConfig);
      applyRuntimeConfig(saved);
      writeLog('Runtime config saved successfully.');

      wizardSubmitCompleted = true;
      if (wizardResolveConfig) {
        const resolve = wizardResolveConfig;
        wizardResolveConfig = null;
        wizardRejectConfig = null;
        wizardInitialConfig = null;
        if (wizardWindow) {
          wizardWindow.close();
        }
        resolve(saved);
      }

      return { ok: true };
    } catch (error) {
      writeLog('Runtime config save failed.', error);
      return { ok: false, message: error.message || 'Failed to save runtime config.' };
    }
  });

  ipcMain.handle('desktop:config:cancel', () => {
    if (wizardWindow) {
      wizardWindow.close();
    }
    return { ok: true };
  });
}

function wireGlobalErrorHandlers() {
  process.on('uncaughtException', (error) => {
    writeLog('Uncaught exception', error);
    dialog.showErrorBox('Lab Inventory Desktop Error', toErrorString(error));
  });
  process.on('unhandledRejection', (error) => {
    writeLog('Unhandled rejection', error);
    dialog.showErrorBox('Lab Inventory Desktop Error', toErrorString(error));
  });
}

async function bootstrap() {
  initLogging();
  wireGlobalErrorHandlers();
  registerIpc();

  const runtimeConfig = await ensureRuntimeConfig();
  applyRuntimeConfig(runtimeConfig);
  writeLog('Runtime configuration loaded.');

  const portFree = await ensurePortAvailable(APP_PORT, APP_HOST);
  if (!portFree) {
    const message = `Port ${APP_PORT} is already in use. Close the conflicting app and restart Lab Inventory Desktop.`;
    writeLog(message);
    dialog.showErrorBox('Port Conflict', message);
    app.quit();
    return;
  }

  await startBackend();
  await waitForServerReady(localhostUrl());
  writeLog(`Backend started on ${localhostUrl()} (${lanUrl() || 'LAN IP unavailable'})`);
  createControlWindow();
  await shell.openExternal(localhostUrl());
}

app.whenReady().then(bootstrap).catch((error) => {
  if (error && String(error.message || '').includes('Configuration wizard was cancelled')) {
    writeLog('Startup cancelled: configuration wizard was closed before save.');
    app.quit();
    return;
  }
  writeLog('Desktop startup failed', error);
  dialog.showErrorBox('Startup Failed', toErrorString(error));
  app.exit(1);
});

app.on('before-quit', (event) => {
  if (shuttingDown) return;
  event.preventDefault();
  shuttingDown = true;
  stopBackend()
    .catch((error) => {
      writeLog('Failed during backend shutdown', error);
    })
    .finally(() => {
      app.exit(0);
    });
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && backendApi && !wizardWindow) {
    createControlWindow();
  }
});
