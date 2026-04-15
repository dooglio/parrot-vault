import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import type { Wallet, NewWallet, UpdateWallet, EnvVar } from '../../shared/types'

// Internal DB record shape (includes sensitive fields not exposed to renderer)
export interface WalletRecord {
  id: number
  name: string
  pinned: number
  wallet_type: string
  exe_path: string
  data_dir: string
  description: string
  notes: string
  deleted: number
}

let db: Database.Database

export function initDb(): void {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'polyvault.db')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS wallets (
      id          INTEGER PRIMARY KEY ASC,
      name        TEXT NOT NULL,
      pinned      INTEGER NOT NULL DEFAULT 0,
      wallet_type TEXT NOT NULL DEFAULT '',
      exe_path    TEXT NOT NULL DEFAULT '',
      data_dir    TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      notes       TEXT NOT NULL DEFAULT '',
      deleted     INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS envvars (
      id    INTEGER PRIMARY KEY ASC,
      name  TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL DEFAULT ''
    );
  `)

  // Migration: add exe_path column if it doesn't exist (for existing DBs)
  try {
    db.exec(`ALTER TABLE wallets ADD COLUMN exe_path TEXT NOT NULL DEFAULT ''`)
  } catch {
    // Column already exists — ignore
  }
}

// ─── Wallets ────────────────────────────────────────────────────────────────

/** Returns all non-deleted wallets, pinned first then alphabetical, safe for renderer */
export function getWallets(): Wallet[] {
  const rows = db
    .prepare(
      `SELECT id, name, pinned, wallet_type, description, notes
       FROM wallets
       WHERE deleted = 0
       ORDER BY pinned DESC, name COLLATE NOCASE ASC`
    )
    .all() as Array<{
    id: number
    name: string
    pinned: number
    wallet_type: string
    description: string
    notes: string
  }>

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    pinned: r.pinned === 1,
    walletType: r.wallet_type,
    description: r.description,
    notes: r.notes,
  }))
}

/** Returns full internal record (including sensitive paths) for main process use only */
export function getWalletRecord(id: number): WalletRecord {
  const row = db
    .prepare(`SELECT * FROM wallets WHERE id = ? AND deleted = 0`)
    .get(id) as WalletRecord | undefined

  if (!row) {
    throw new Error(`Wallet id=${id} not found`)
  }
  return row
}

export function addWallet(data: NewWallet): Wallet {
  const stmt = db.prepare(`
    INSERT INTO wallets (name, pinned, wallet_type, exe_path, data_dir, description, notes, deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `)
  const result = stmt.run(
    data.name,
    data.pinned ? 1 : 0,
    data.walletType,
    data.exePath,
    data.dataDir,
    data.description,
    data.notes
  )
  const id = result.lastInsertRowid as number
  return getWallets().find((w) => w.id === id)!
}

export function updateWallet(id: number, data: UpdateWallet): Wallet {
  const current = getWalletRecord(id)

  db.prepare(`
    UPDATE wallets SET
      name        = ?,
      pinned      = ?,
      wallet_type = ?,
      exe_path    = ?,
      data_dir    = ?,
      description = ?,
      notes       = ?
    WHERE id = ?
  `).run(
    data.name        ?? current.name,
    data.pinned      !== undefined ? (data.pinned ? 1 : 0) : current.pinned,
    data.walletType  ?? current.wallet_type,
    data.exePath     ?? current.exe_path,
    data.dataDir     ?? current.data_dir,
    data.description ?? current.description,
    data.notes       ?? current.notes,
    id
  )

  return getWallets().find((w) => w.id === id)!
}

/** Soft-deletes a wallet. Optionally removes the data_dir from disk. */
export function deleteWallet(id: number, deleteFiles: boolean): void {
  if (deleteFiles) {
    const row = db
      .prepare(`SELECT data_dir FROM wallets WHERE id = ?`)
      .get(id) as { data_dir: string } | undefined

    if (row?.data_dir) {
      const fs = require('fs') as typeof import('fs')
      if (fs.existsSync(row.data_dir)) {
        fs.rmSync(row.data_dir, { recursive: true, force: true })
      }
    }
  }

  db.prepare(`UPDATE wallets SET deleted = 1 WHERE id = ?`).run(id)

  // Compact: remove permanently deleted rows
  db.prepare(`DELETE FROM wallets WHERE deleted = 1`).run()
}

// ─── Env Vars ────────────────────────────────────────────────────────────────

export function getEnvVars(): EnvVar[] {
  return db.prepare(`SELECT id, name, value FROM envvars ORDER BY name COLLATE NOCASE ASC`).all() as EnvVar[]
}

export function setEnvVar(name: string, value: string): void {
  db.prepare(`INSERT OR REPLACE INTO envvars (name, value) VALUES (?, ?)`).run(name, value)
}

export function deleteEnvVar(name: string): void {
  db.prepare(`DELETE FROM envvars WHERE name = ?`).run(name)
}

/** Returns all env vars as a plain object, for injecting into spawned processes */
export function getEnvVarsMap(): Record<string, string> {
  const vars = getEnvVars()
  return Object.fromEntries(vars.map((v) => [v.name, v.value]))
}
