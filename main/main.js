import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { join } from 'path';

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

// Replace this with your hosted backend URL
const BACKEND_URL = 'https://needha-erp-server.onrender.com'; // Change to your backend's URL

// Function to create the main application window
function createMainWindow() {
  try {
    console.log('[DEBUG] Creating main window...');
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'), // Preload script for secure communication
      },
    });

    if (app.isPackaged) {
      console.log('[DEBUG] Loading packaged Next.js app...');
      // In packaged mode, load the static build from the `out/` folder
      mainWindow.loadURL('app://-/page.tsx');
    } else {
      console.log('[DEBUG] Loading Next.js from localhost:3000...');
      // In development, load the Next.js app from localhost
      mainWindow.loadURL('http://localhost:3000');
      mainWindow.webContents.openDevTools();
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

    // Send login request to the hosted backend
    const response = await fetch(`${BACKEND_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const result = await response.json(); // Parse the backend response
    console.log('[DEBUG] Backend response:', result);

    if (result.success) {
      console.log('[DEBUG] Login successful:', result.message);
      // Redirect to the dashboard on successful login
      await mainWindow.loadFile('dashboard.html').catch((err) => {
        console.error('[ERROR] Failed to load dashboard.html:', err);
      });
    } else {
      console.error('[DEBUG] Login failed:', result.error);
    }

    return result; // Send the result back to the renderer process
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
