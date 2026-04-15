import { spawn, ChildProcess } from 'child_process'
import { BrowserWindow } from 'electron'
import { getWalletRecord, getEnvVarsMap } from './db'
import type { ProcessErrorType } from '../../shared/types'

interface ManagedProcess {
  process: ChildProcess
  walletId: number
}

const runningProcesses = new Map<number, ManagedProcess>()

/** Get the BrowserWindow to send IPC events to renderer */
function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows()
  return windows.length > 0 ? windows[0] : null
}

function sendToRenderer(channel: string, ...args: unknown[]): void {
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, ...args)
  }
}

export function runWallet(id: number): void {
  if (runningProcesses.has(id)) {
    console.warn(`Wallet id=${id} is already running`)
    return
  }

  const record = getWalletRecord(id)

  if (!record.exe_path) {
    sendToRenderer('process:error', id, 'failed-to-start' as ProcessErrorType)
    return
  }

  const args: string[] = []
  if (record.data_dir) {
    args.push('--datadir', record.data_dir)
  }

  // Merge system env with custom env vars from DB
  const customEnv = getEnvVarsMap()
  const env = { ...process.env, ...customEnv }

  const child = spawn(record.exe_path, args, {
    env,
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  runningProcesses.set(id, { process: child, walletId: id })

  child.on('spawn', () => {
    sendToRenderer('process:start', id)
  })

  child.stdout?.on('data', (data: Buffer) => {
    sendToRenderer('process:stdout', id, data.toString('utf8'))
  })

  child.stderr?.on('data', (data: Buffer) => {
    sendToRenderer('process:stderr', id, data.toString('utf8'))
  })

  child.on('error', (err) => {
    console.error(`Wallet id=${id} error:`, err)
    runningProcesses.delete(id)

    const errorType: ProcessErrorType = err.message.includes('ENOENT') ? 'failed-to-start' : 'other'
    sendToRenderer('process:error', id, errorType)
  })

  child.on('close', (code, signal) => {
    runningProcesses.delete(id)

    if (signal === 'SIGKILL' || signal === 'SIGTERM') {
      sendToRenderer('process:error', id, 'crashed' as ProcessErrorType)
    }
    sendToRenderer('process:stop', id)
  })
}

export function stopWallet(id: number): void {
  const managed = runningProcesses.get(id)
  if (!managed) {
    return
  }
  managed.process.kill('SIGTERM')
  // Force kill after 3s if still running
  setTimeout(() => {
    if (runningProcesses.has(id)) {
      managed.process.kill('SIGKILL')
    }
  }, 3000)
}

export function stopAllWallets(): Promise<void> {
  return new Promise((resolve) => {
    if (runningProcesses.size === 0) {
      resolve()
      return
    }

    let remaining = runningProcesses.size

    for (const [id, managed] of runningProcesses) {
      managed.process.once('close', () => {
        remaining--
        if (remaining === 0) resolve()
      })
      managed.process.kill('SIGTERM')
      // Force kill after 3s
      setTimeout(() => {
        if (runningProcesses.has(id)) {
          managed.process.kill('SIGKILL')
        }
      }, 3000)
    }
  })
}

export function isWalletRunning(id: number): boolean {
  return runningProcesses.has(id)
}

export function getRunningWalletIds(): number[] {
  return Array.from(runningProcesses.keys())
}

export function hasRunningWallets(): boolean {
  return runningProcesses.size > 0
}
