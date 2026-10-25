const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");

const appIcon = path.join(__dirname, "icon.ico");
// The desktop release deliberately loads the canonical hosted demo instead of
// a separate, locally-built data store. It therefore uses the same Supabase
// demo transport as a phone opened at this address.
const ONLINE_WORKSPACE_URL = "https://microtrace-demo.vercel.app";
const onlineOrigin = new URL(ONLINE_WORKSPACE_URL).origin;

function isOnlineWorkspace(url) {
  try { return new URL(url).origin === onlineOrigin; } catch { return false; }
}

function openConnectionHelp(window, description) {
  const message = String(description || "The online MicroTrace workspace could not be reached.")
    .replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
  const retry = ONLINE_WORKSPACE_URL.replace(/&/g, "&amp;");
  void window.loadURL(`data:text/html;charset=UTF-8,<!doctype html><title>MicroTrace connection required</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#eef1f6;color:#15233c;font:16px system-ui,-apple-system,Segoe UI,sans-serif}.card{max-width:520px;margin:24px;padding:30px;border-radius:18px;background:#fff;box-shadow:0 14px 45px #0f214226}h1{margin:0 0 12px;font-size:24px}p{line-height:1.55;color:#4b5563}a{display:inline-block;margin-top:10px;border-radius:9px;padding:11px 16px;background:#0f2142;color:#fff;text-decoration:none;font-weight:700}</style><main class="card"><h1>MicroTrace needs an internet connection</h1><p>This desktop app is connected to the same online workspace as your phone, so requests and staff decisions stay synchronized.</p><p>${message}</p><a href="${retry}">Retry connection</a></main>`);
}

function createWindow() {
  const window = new BrowserWindow({
    title: "MicroTrace Demo — Online Workspace",
    icon: appIcon,
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#eef1f6",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setUserAgent(`${window.webContents.getUserAgent()} MicroTraceDesktop`);
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isOnlineWorkspace(url)) return { action: "allow" };
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (isOnlineWorkspace(url) || url.startsWith("data:text/html")) return;
    event.preventDefault();
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
  });
  window.webContents.on("did-fail-load", (_event, _code, description, validatedURL, isMainFrame) => {
    if (isMainFrame && isOnlineWorkspace(validatedURL)) openConnectionHelp(window, description);
  });

  void window.loadURL(ONLINE_WORKSPACE_URL).catch((error) => openConnectionHelp(window, error.message));
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
