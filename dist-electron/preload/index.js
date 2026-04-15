"use strict";
const electron = require("electron");
const electronAPI = {
  // ─── Wallets ──────────────────────────────────────────────────────────────
  getWallets: () => electron.ipcRenderer.invoke("wallets:getAll"),
  addWallet: (data) => electron.ipcRenderer.invoke("wallets:add", data),
  updateWallet: (id, data) => electron.ipcRenderer.invoke("wallets:update", id, data),
  deleteWallet: (id, deleteFiles) => electron.ipcRenderer.invoke("wallets:delete", id, deleteFiles),
  // ─── Processes ────────────────────────────────────────────────────────────
  runWallet: (id) => electron.ipcRenderer.invoke("process:run", id),
  stopWallet: (id) => electron.ipcRenderer.invoke("process:stop", id),
  stopAllWallets: () => electron.ipcRenderer.invoke("process:stopAll"),
  getRunningWallets: () => electron.ipcRenderer.invoke("process:getRunning"),
  // ─── Env vars ─────────────────────────────────────────────────────────────
  getEnvVars: () => electron.ipcRenderer.invoke("envvars:getAll"),
  setEnvVar: (name, value) => electron.ipcRenderer.invoke("envvars:set", name, value),
  deleteEnvVar: (name) => electron.ipcRenderer.invoke("envvars:delete", name),
  // ─── File dialogs ─────────────────────────────────────────────────────────
  openFileDialog: (title, defaultPath) => electron.ipcRenderer.invoke("dialog:openFile", title, defaultPath),
  openDirectoryDialog: (title, defaultPath) => electron.ipcRenderer.invoke("dialog:openDirectory", title, defaultPath),
  // ─── Process events (main → renderer push) ────────────────────────────────
  onProcessStart: (cb) => {
    const handler = (_event, id) => cb(id);
    electron.ipcRenderer.on("process:start", handler);
    return () => electron.ipcRenderer.removeListener("process:start", handler);
  },
  onProcessStop: (cb) => {
    const handler = (_event, id) => cb(id);
    electron.ipcRenderer.on("process:stop", handler);
    return () => electron.ipcRenderer.removeListener("process:stop", handler);
  },
  onProcessError: (cb) => {
    const handler = (_event, id, error) => cb(id, error);
    electron.ipcRenderer.on("process:error", handler);
    return () => electron.ipcRenderer.removeListener("process:error", handler);
  },
  onProcessStdout: (cb) => {
    const handler = (_event, id, output) => cb(id, output);
    electron.ipcRenderer.on("process:stdout", handler);
    return () => electron.ipcRenderer.removeListener("process:stdout", handler);
  },
  onProcessStderr: (cb) => {
    const handler = (_event, id, output) => cb(id, output);
    electron.ipcRenderer.on("process:stderr", handler);
    return () => electron.ipcRenderer.removeListener("process:stderr", handler);
  }
};
electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
