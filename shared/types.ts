// Shared types between main process and renderer (via IPC)
// NOTE: These must NOT contain any Node.js-only types — they are used in both contexts

// ─── Wallet Type Definitions ─────────────────────────────────────────────────
// A WalletTypeDefinition describes a wallet *application* (e.g. Exodus).
// It lives in Settings and is referenced by individual Wallet instances.

export type WalletPreset = 'exodus' | 'custom'

export interface WalletTypeDefinition {
  id: number
  name: string
  /** Icon key: a built-in preset name (e.g. "exodus") or "custom" */
  icon: string
  /** Absolute path to the wallet executable */
  exePath: string
  /** CLI flag used to pass a data directory, e.g. "--datadir". Empty = not supported. */
  dataDirFlag: string
  /** Which preset this was created from */
  preset: WalletPreset
}

export interface NewWalletTypeDefinition {
  name: string
  icon: string
  exePath: string
  dataDirFlag: string
  preset: WalletPreset
}

export interface UpdateWalletTypeDefinition {
  name?: string
  icon?: string
  exePath?: string
  dataDirFlag?: string
  preset?: WalletPreset
}

// ─── Wallets ──────────────────────────────────────────────────────────────────

export interface Wallet {
  id: number
  name: string
  pinned: boolean
  walletType: string // e.g. "Exodus", "Electrum", "MetaMask"
  description: string
  notes: string
  // dataDir and exePath are intentionally excluded — main process only
}

export interface NewWallet {
  name: string
  pinned: boolean
  walletType: string
  description: string
  notes: string
  dataDir: string // provided by renderer when creating, stored in main only
  exePath: string // provided by renderer when creating, stored in main only
}

export interface UpdateWallet {
  name?: string
  pinned?: boolean
  walletType?: string
  description?: string
  notes?: string
  dataDir?: string
  exePath?: string
}

export interface EnvVar {
  id: number
  name: string
  value: string
}

export type ProcessStatus = 'running' | 'stopped' | 'error' | 'failed-to-start' | 'crashed'

export interface ProcessState {
  id: number
  status: ProcessStatus
  errorMessage?: string
}

export type ProcessErrorType = 'failed-to-start' | 'crashed' | 'other'
