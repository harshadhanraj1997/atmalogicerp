import { app, BrowserWindow, ipcMain, protocol } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

// Backend API URL
const BACKEND_URL = 'https://needha-erp-server.onrender.com';

// Function to create the main application window
function createMainWindow() {
  try {
    console.log('[DEBUG] Creating main window...');

    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'), // Ensure this file exists
        nodeIntegration: false, // Enforce security best practices
        contextIsolation: true, // Enforce security
        enableRemoteModule: false, // Disable remote module for security
      },
    });

    // Set default zoom level
    mainWindow.webContents.setZoomFactor(0.7);

    if (app.isPackaged) {
      console.log('[DEBUG] Loading packaged Next.js app...');
      mainWindow.loadURL(`file://${path.join(__dirname, '../out/index.html')}`);
    } else {
      console.log('[DEBUG] Loading Next.js from localhost:3000...');
      mainWindow.loadURL('http://localhost:3000');
      mainWindow.webContents.openDevTools(); // Keep DevTools open in dev mode
    }

    // Handle the window close event
    mainWindow.on('closed', () => {
      console.log('[DEBUG] Main window closed.');
      mainWindow = null;
    });
  } catch (error) {
    console.error('[ERROR] Failed to create main window:', error);
  }
}

// Handle application lifecycle events
app.whenReady().then(() => {
  console.log('[DEBUG] App is ready.');
  createMainWindow();

  // macOS-specific behavior: recreate window if no other windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      console.log('[DEBUG] Recreating main window...');
      createMainWindow();
    }
  });
});

// Quit the app when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  console.log('[DEBUG] All windows closed.');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.disableHardwareAcceleration();

// Backend communication: Handle login requests from renderer process
ipcMain.handle('login', async (event, credentials) => {
  try {
    console.log('[DEBUG] Handling login request from renderer:', credentials);

    // Send login request to backend
    const response = await fetch(`${BACKEND_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const result = await response.json(); // Parse the backend response
    console.log('[DEBUG] Backend response:', result);

    if (result.success) {
      console.log('[DEBUG] Login successful:', result.message);
      // Load dashboard page correctly
      if (app.isPackaged) {
        mainWindow.loadURL(`file://${path.join(__dirname, '../out/orders.html')}`);
      } else {
        mainWindow.loadURL('http://localhost:3000/orders');
      }
    } else {
      console.error('[DEBUG] Login failed:', result.error);
    }

    return result;
  } catch (error) {
    console.error('[ERROR] Error during backend communication:', error);
    return { success: false, error: 'Failed to connect to the server' };
  }
});

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[ERROR] Uncaught exception:', error);
});

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[ERROR] Unhandled promise rejection:', reason, promise);
});
