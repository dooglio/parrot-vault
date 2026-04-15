import { ipcMain, dialog } from 'electron'
import * as db from './db'
import * as pm from './processManager'
import type { NewWallet, UpdateWallet } from '../../shared/types'

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
}
