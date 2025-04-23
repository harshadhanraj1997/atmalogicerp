import { app, BrowserWindow, ipcMain, protocol } from 'electron';
import serve from 'electron-serve';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import fs from 'fs';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize electron serve for production
// Change how we set up loadURL to make sure it finds the right directory
let loadURL;
if (app.isPackaged) {
  console.log('[DEBUG] App is packaged, setting up loadURL with absolute path');
  const outPath = path.join(__dirname, 'out');
  console.log('[DEBUG] Looking for out directory at:', outPath);
  
  if (fs.existsSync(outPath)) {
    console.log('[DEBUG] Found out directory at expected path');
    loadURL = serve({ directory: 'out' });
  } else {
    console.log('[DEBUG] Out directory not found at expected path, trying alternatives');
    
    // Try a few common locations for packaged apps
    const possiblePaths = [
      path.join(app.getAppPath(), 'out'),
      path.join(app.getAppPath(), '..', 'out'),
      path.join(app.getPath('exe'), '..', 'resources', 'app', 'out')
    ];
    
    let foundPath = null;
    for (const testPath of possiblePaths) {
      console.log('[DEBUG] Checking:', testPath);
      if (fs.existsSync(testPath)) {
        foundPath = testPath;
        console.log('[DEBUG] Found out directory at:', foundPath);
        break;
      }
    }
    
    if (foundPath) {
      // Use a relative path from app directory
      const relativePath = path.relative(app.getAppPath(), foundPath);
      console.log('[DEBUG] Using relative path for loadURL:', relativePath);
      loadURL = serve({ directory: relativePath });
    } else {
      console.log('[DEBUG] Could not find out directory, using default');
      loadURL = serve({ directory: 'out' });
    }
  }
} else {
  console.log('[DEBUG] App is in development mode, using default out directory');
  loadURL = serve({ directory: 'out' });
}

// Backend API URL
const BACKEND_URL = 'https://needha-erp-server-xrdp.onrender.com';

let mainWindow;

async function createMainWindow() {
  try {
    console.log('[DEBUG] Creating main window...');

    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),  // Changed to .js extension
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: true
      },
    });

    if (app.isPackaged) {
      console.log('[DEBUG] Loading packaged Next.js app...');
      await loadURL(mainWindow);
    } else {
      console.log('[DEBUG] Loading Next.js from localhost:3000...');
      await mainWindow.loadURL('http://localhost:3000');
      mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
      console.log('[DEBUG] Main window closed.');
      mainWindow = null;
    });

  } catch (error) {
    console.error('[ERROR] Failed to create main window:', error);
  }
}

// Initialize app
app.whenReady().then(async () => {
  try {
    console.log('[DEBUG] App is ready.');

    if (app.isPackaged) {
      protocol.registerFileProtocol('app', (request, callback) => {
        const url = request.url.substring(6);
        callback({ path: path.normalize(`${__dirname}/${url}`) });
      });
    }

    await createMainWindow();
  } catch (error) {
    console.error('[ERROR] Failed during app initialization:', error);
  }
});

app.on('activate', async () => {
  if (!mainWindow) {
    await createMainWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('login', async (event, credentials) => {
  try {
    console.log('[DEBUG] Handling login request from renderer');

    const response = await fetch(`${BACKEND_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const result = await response.json();
    
    if (result.success && mainWindow) {
      if (app.isPackaged) {
        await loadURL(mainWindow, '/orders');
      } else {
        await mainWindow.loadURL('http://localhost:3000/orders');
      }
    }

    return result;
  } catch (error) {
    console.error('[ERROR] Error during backend communication:', error);
    return { success: false, error: 'Failed to connect to the server' };
  }
});