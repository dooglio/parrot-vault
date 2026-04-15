import { contextBridge, ipcRenderer } from 'electron'
import type { Wallet, NewWallet, UpdateWallet, EnvVar, ProcessErrorType } from '../../shared/types'

/**
 * Secure IPC bridge exposed to the renderer as window.electronAPI
 * - Never exposes raw file paths (except through dialog returns)
 * - Never exposes Node.js APIs
 */
const electronAPI = {
  // ─── Wallets ──────────────────────────────────────────────────────────────
  getWallets: (): Promise<Wallet[]> => ipcRenderer.invoke('wallets:getAll'),

  addWallet: (data: NewWallet): Promise<Wallet> => ipcRenderer.invoke('wallets:add', data),

  updateWallet: (id: number, data: UpdateWallet): Promise<Wallet> =>
    ipcRenderer.invoke('wallets:update', id, data),

  deleteWallet: (id: number, deleteFiles: boolean): Promise<void> =>
    ipcRenderer.invoke('wallets:delete', id, deleteFiles),

  // ─── Processes ────────────────────────────────────────────────────────────
  runWallet: (id: number): Promise<void> => ipcRenderer.invoke('process:run', id),

  stopWallet: (id: number): Promise<void> => ipcRenderer.invoke('process:stop', id),

  stopAllWallets: (): Promise<void> => ipcRenderer.invoke('process:stopAll'),

  getRunningWallets: (): Promise<number[]> => ipcRenderer.invoke('process:getRunning'),

  // ─── Env vars ─────────────────────────────────────────────────────────────
  getEnvVars: (): Promise<EnvVar[]> => ipcRenderer.invoke('envvars:getAll'),

  setEnvVar: (name: string, value: string): Promise<void> =>
    ipcRenderer.invoke('envvars:set', name, value),

  deleteEnvVar: (name: string): Promise<void> => ipcRenderer.invoke('envvars:delete', name),

  // ─── File dialogs ─────────────────────────────────────────────────────────
  openFileDialog: (title: string, defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:openFile', title, defaultPath),

  openDirectoryDialog: (title: string, defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:openDirectory', title, defaultPath),

  // ─── Process events (main → renderer push) ────────────────────────────────
  onProcessStart: (cb: (id: number) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, id: number) => cb(id)
    ipcRenderer.on('process:start', handler)
    return () => ipcRenderer.removeListener('process:start', handler)
  },

  onProcessStop: (cb: (id: number) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, id: number) => cb(id)
    ipcRenderer.on('process:stop', handler)
    return () => ipcRenderer.removeListener('process:stop', handler)
  },

  onProcessError: (cb: (id: number, error: ProcessErrorType) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, id: number, error: ProcessErrorType) =>
      cb(id, error)
    ipcRenderer.on('process:error', handler)
    return () => ipcRenderer.removeListener('process:error', handler)
  },

  onProcessStdout: (cb: (id: number, output: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, id: number, output: string) =>
      cb(id, output)
    ipcRenderer.on('process:stdout', handler)
    return () => ipcRenderer.removeListener('process:stdout', handler)
  },

  onProcessStderr: (cb: (id: number, output: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, id: number, output: string) =>
      cb(id, output)
    ipcRenderer.on('process:stderr', handler)
    return () => ipcRenderer.removeListener('process:stderr', handler)
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
