import { app, BrowserWindow, dialog, shell, systemPreferences } from 'electron'
import path from 'path'
import { initDb } from './db'
import { registerIpcHandlers } from './ipcHandlers'
import { hasRunningWallets, stopAllWallets } from './processManager'

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require('electron-squirrel-startup')) app.quit()

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 560,
    backgroundColor: '#0f1117',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // needed for preload to use require
    },
    icon: path.join(__dirname, '../../build/icons/app.icns'),
  })

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    mainWindow.loadURL(devServerUrl)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

async function requestMacPermissions(): Promise<void> {
  if (process.platform !== 'darwin') return

  // Camera: triggers the system permission dialog on first request
  const cameraGranted = await systemPreferences.askForMediaAccess('camera')
  if (!cameraGranted) {
    console.warn('Camera permission was denied')
  }

  // Screen recording: macOS does not allow programmatic granting —
  // we can only check the status and guide the user to System Settings
  const screenStatus = systemPreferences.getMediaAccessStatus('screen')
  if (screenStatus !== 'granted') {
    const { response } = await dialog.showMessageBox({
      type: 'info',
      title: 'Screen Recording Permission Required',
      message:
        'PolyVault needs screen recording permission to read QR codes displayed on your screen.',
      detail:
        'Please open System Settings → Privacy & Security → Screen Recording and enable PolyVault.',
      buttons: ['Open System Settings', 'Later'],
      defaultId: 0,
    })
    if (response === 0) {
      shell.openExternal(
        'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'
      )
    }
  }
}

app.whenReady().then(async () => {
  // Initialize SQLite database
  initDb()

  // Register all IPC handlers
  registerIpcHandlers()

  createWindow()

  // Request macOS permissions (camera dialog + screen recording guidance)
  await requestMacPermissions()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Gracefully stop all running wallet processes before quit
app.on('before-quit', async (event) => {
  if (hasRunningWallets()) {
    event.preventDefault()
    await stopAllWallets()
    app.quit()
  }
})
