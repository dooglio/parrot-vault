import { ipcMain, dialog, app, nativeImage } from 'electron'
import * as os from 'os'
import * as db from './db'
import * as pm from './processManager'
import type {
  NewWallet,
  UpdateWallet,
  NewWalletTypeDefinition,
  UpdateWalletTypeDefinition,
} from '../../shared/types'

export function registerIpcHandlers(): void {
  // ─── Wallets ──────────────────────────────────────────────────────────────

  ipcMain.handle('wallets:getAll', () => {
    return db.getWallets()
  })

  ipcMain.handle('wallets:add', (_event, data: NewWallet) => {
    return db.addWallet(data)
  })

  ipcMain.handle('wallets:update', (_event, id: number, data: UpdateWallet) => {
    return db.updateWallet(id, data)
  })

  ipcMain.handle('wallets:delete', (_event, id: number, deleteFiles: boolean) => {
    // Cannot delete a running wallet
    if (pm.isWalletRunning(id)) {
      throw new Error('Cannot delete a running wallet. Stop it first.')
    }
    db.deleteWallet(id, deleteFiles)
  })

  // ─── Process management ───────────────────────────────────────────────────

  ipcMain.handle('process:run', (_event, id: number) => {
    pm.runWallet(id)
  })

  ipcMain.handle('process:stop', (_event, id: number) => {
    pm.stopWallet(id)
  })

  ipcMain.handle('process:stopAll', () => {
    return pm.stopAllWallets()
  })

  ipcMain.handle('process:getRunning', () => {
    return pm.getRunningWalletIds()
  })

  // ─── Env vars ─────────────────────────────────────────────────────────────

  ipcMain.handle('envvars:getAll', () => {
    return db.getEnvVars()
  })

  ipcMain.handle('envvars:set', (_event, name: string, value: string) => {
    db.setEnvVar(name, value)
  })

  ipcMain.handle('envvars:delete', (_event, name: string) => {
    db.deleteEnvVar(name)
  })

  // ─── Wallet Types ──────────────────────────────────────────────────────────

  ipcMain.handle('walletTypes:getAll', () => {
    return db.getWalletTypes()
  })

  ipcMain.handle('walletTypes:add', (_event, data: NewWalletTypeDefinition) => {
    return db.addWalletType(data)
  })

  ipcMain.handle('walletTypes:update', (_event, id: number, data: UpdateWalletTypeDefinition) => {
    return db.updateWalletType(id, data)
  })

  ipcMain.handle('walletTypes:delete', (_event, id: number) => {
    db.deleteWalletType(id)
  })

  // ─── Platform info ─────────────────────────────────────────────────────────

  ipcMain.handle('app:getPlatformDefaults', () => {
    return { platform: process.platform, homeDir: os.homedir() }
  })

  // ─── File dialogs (safe: returns path chosen by user, no raw FS exposure) ─

  ipcMain.handle('dialog:openFile', async (_event, title: string, defaultPath?: string) => {
    const result = await dialog.showOpenDialog({
      title,
      defaultPath,
      properties: ['openFile'],
      filters: [
        { name: 'Executables', extensions: process.platform === 'win32' ? ['exe'] : ['*'] },
      ],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('dialog:openDirectory', async (_event, title: string, defaultPath?: string) => {
    const result = await dialog.showOpenDialog({
      title,
      defaultPath,
      properties: ['openDirectory', 'createDirectory'],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  /**
   * Attempt to extract the icon from a file/app bundle.
   * Returns a base64-encoded PNG data URL, or null on failure.
   */
  ipcMain.handle('dialog:getFileIcon', async (_event, filePath: string) => {
    try {
      const img = await app.getFileIcon(filePath, { size: 'large' })
      const png = img.toPNG()
      return `data:image/png;base64,${png.toString('base64')}`
    } catch {
      return null
    }
  })
}
