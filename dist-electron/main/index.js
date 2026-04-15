"use strict";
const electron = require("electron");
const path = require("path");
const Database = require("better-sqlite3");
const child_process = require("child_process");
let db;
function initDb() {
  const userDataPath = electron.app.getPath("userData");
  const dbPath = path.join(userDataPath, "polyvault.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
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
  `);
  try {
    db.exec(`ALTER TABLE wallets ADD COLUMN exe_path TEXT NOT NULL DEFAULT ''`);
  } catch {
  }
}
function getWallets() {
  const rows = db.prepare(
    `SELECT id, name, pinned, wallet_type, description, notes
       FROM wallets
       WHERE deleted = 0
       ORDER BY pinned DESC, name COLLATE NOCASE ASC`
  ).all();
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    pinned: r.pinned === 1,
    walletType: r.wallet_type,
    description: r.description,
    notes: r.notes
  }));
}
function getWalletRecord(id) {
  const row = db.prepare(`SELECT * FROM wallets WHERE id = ? AND deleted = 0`).get(id);
  if (!row) {
    throw new Error(`Wallet id=${id} not found`);
  }
  return row;
}
function addWallet(data) {
  const stmt = db.prepare(`
    INSERT INTO wallets (name, pinned, wallet_type, exe_path, data_dir, description, notes, deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `);
  const result = stmt.run(
    data.name,
    data.pinned ? 1 : 0,
    data.walletType,
    data.exePath,
    data.dataDir,
    data.description,
    data.notes
  );
  const id = result.lastInsertRowid;
  return getWallets().find((w) => w.id === id);
}
function updateWallet(id, data) {
  const current = getWalletRecord(id);
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
    data.name ?? current.name,
    data.pinned !== void 0 ? data.pinned ? 1 : 0 : current.pinned,
    data.walletType ?? current.wallet_type,
    data.exePath ?? current.exe_path,
    data.dataDir ?? current.data_dir,
    data.description ?? current.description,
    data.notes ?? current.notes,
    id
  );
  return getWallets().find((w) => w.id === id);
}
function deleteWallet(id, deleteFiles) {
  if (deleteFiles) {
    const row = db.prepare(`SELECT data_dir FROM wallets WHERE id = ?`).get(id);
    if (row == null ? void 0 : row.data_dir) {
      const fs = require("fs");
      if (fs.existsSync(row.data_dir)) {
        fs.rmSync(row.data_dir, { recursive: true, force: true });
      }
    }
  }
  db.prepare(`UPDATE wallets SET deleted = 1 WHERE id = ?`).run(id);
  db.prepare(`DELETE FROM wallets WHERE deleted = 1`).run();
}
function getEnvVars() {
  return db.prepare(`SELECT id, name, value FROM envvars ORDER BY name COLLATE NOCASE ASC`).all();
}
function setEnvVar(name, value) {
  db.prepare(`INSERT OR REPLACE INTO envvars (name, value) VALUES (?, ?)`).run(name, value);
}
function deleteEnvVar(name) {
  db.prepare(`DELETE FROM envvars WHERE name = ?`).run(name);
}
function getEnvVarsMap() {
  const vars = getEnvVars();
  return Object.fromEntries(vars.map((v) => [v.name, v.value]));
}
const runningProcesses = /* @__PURE__ */ new Map();
function getMainWindow() {
  const windows = electron.BrowserWindow.getAllWindows();
  return windows.length > 0 ? windows[0] : null;
}
function sendToRenderer(channel, ...args) {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, ...args);
  }
}
function runWallet(id) {
  var _a, _b;
  if (runningProcesses.has(id)) {
    console.warn(`Wallet id=${id} is already running`);
    return;
  }
  const record = getWalletRecord(id);
  if (!record.exe_path) {
    sendToRenderer("process:error", id, "failed-to-start");
    return;
  }
  const args = [];
  if (record.data_dir) {
    args.push("--datadir", record.data_dir);
  }
  const customEnv = getEnvVarsMap();
  const env = { ...process.env, ...customEnv };
  const child = child_process.spawn(record.exe_path, args, {
    env,
    detached: false,
    stdio: ["ignore", "pipe", "pipe"]
  });
  runningProcesses.set(id, { process: child, walletId: id });
  child.on("spawn", () => {
    sendToRenderer("process:start", id);
  });
  (_a = child.stdout) == null ? void 0 : _a.on("data", (data) => {
    sendToRenderer("process:stdout", id, data.toString("utf8"));
  });
  (_b = child.stderr) == null ? void 0 : _b.on("data", (data) => {
    sendToRenderer("process:stderr", id, data.toString("utf8"));
  });
  child.on("error", (err) => {
    console.error(`Wallet id=${id} error:`, err);
    runningProcesses.delete(id);
    const errorType = err.message.includes("ENOENT") ? "failed-to-start" : "other";
    sendToRenderer("process:error", id, errorType);
  });
  child.on("close", (code, signal) => {
    runningProcesses.delete(id);
    if (signal === "SIGKILL" || signal === "SIGTERM") {
      sendToRenderer("process:error", id, "crashed");
    }
    sendToRenderer("process:stop", id);
  });
}
function stopWallet(id) {
  const managed = runningProcesses.get(id);
  if (!managed) {
    return;
  }
  managed.process.kill("SIGTERM");
  setTimeout(() => {
    if (runningProcesses.has(id)) {
      managed.process.kill("SIGKILL");
    }
  }, 3e3);
}
function stopAllWallets() {
  return new Promise((resolve) => {
    if (runningProcesses.size === 0) {
      resolve();
      return;
    }
    let remaining = runningProcesses.size;
    for (const [id, managed] of runningProcesses) {
      managed.process.once("close", () => {
        remaining--;
        if (remaining === 0) resolve();
      });
      managed.process.kill("SIGTERM");
      setTimeout(() => {
        if (runningProcesses.has(id)) {
          managed.process.kill("SIGKILL");
        }
      }, 3e3);
    }
  });
}
function isWalletRunning(id) {
  return runningProcesses.has(id);
}
function getRunningWalletIds() {
  return Array.from(runningProcesses.keys());
}
function hasRunningWallets() {
  return runningProcesses.size > 0;
}
function registerIpcHandlers() {
  electron.ipcMain.handle("wallets:getAll", () => {
    return getWallets();
  });
  electron.ipcMain.handle("wallets:add", (_event, data) => {
    return addWallet(data);
  });
  electron.ipcMain.handle("wallets:update", (_event, id, data) => {
    return updateWallet(id, data);
  });
  electron.ipcMain.handle("wallets:delete", (_event, id, deleteFiles) => {
    if (isWalletRunning(id)) {
      throw new Error("Cannot delete a running wallet. Stop it first.");
    }
    deleteWallet(id, deleteFiles);
  });
  electron.ipcMain.handle("process:run", (_event, id) => {
    runWallet(id);
  });
  electron.ipcMain.handle("process:stop", (_event, id) => {
    stopWallet(id);
  });
  electron.ipcMain.handle("process:stopAll", () => {
    return stopAllWallets();
  });
  electron.ipcMain.handle("process:getRunning", () => {
    return getRunningWalletIds();
  });
  electron.ipcMain.handle("envvars:getAll", () => {
    return getEnvVars();
  });
  electron.ipcMain.handle("envvars:set", (_event, name, value) => {
    setEnvVar(name, value);
  });
  electron.ipcMain.handle("envvars:delete", (_event, name) => {
    deleteEnvVar(name);
  });
  electron.ipcMain.handle("dialog:openFile", async (_event, title, defaultPath) => {
    const result = await electron.dialog.showOpenDialog({
      title,
      defaultPath,
      properties: ["openFile"],
      filters: [
        { name: "Executables", extensions: process.platform === "win32" ? ["exe"] : ["*"] }
      ]
    });
    return result.canceled ? null : result.filePaths[0];
  });
  electron.ipcMain.handle("dialog:openDirectory", async (_event, title, defaultPath) => {
    const result = await electron.dialog.showOpenDialog({
      title,
      defaultPath,
      properties: ["openDirectory", "createDirectory"]
    });
    return result.canceled ? null : result.filePaths[0];
  });
}
if (require("electron-squirrel-startup")) electron.app.quit();
const isDev = process.env.NODE_ENV === "development" || !electron.app.isPackaged;
let mainWindow = null;
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 560,
    backgroundColor: "#0f1117",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
      // needed for preload to use require
    },
    icon: path.join(__dirname, "../../build/icons/app.icns")
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    electron.shell.openExternal(url);
    return { action: "deny" };
  });
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
electron.app.whenReady().then(() => {
  initDb();
  registerIpcHandlers();
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("before-quit", async (event) => {
  if (hasRunningWallets()) {
    event.preventDefault();
    await stopAllWallets();
    electron.app.quit();
  }
});
