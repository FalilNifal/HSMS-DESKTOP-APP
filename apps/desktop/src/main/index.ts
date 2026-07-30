import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { spawn, ChildProcess } from 'child_process'

let backendProcess: ChildProcess | null = null

/**
 * In a packaged build, start the bundled .NET API as a background process.
 * In dev we do nothing here — run the API yourself with:
 *   dotnet run --launch-profile http   (from backend/HSMS.API)
 *
 * To enable this, publish the API into apps/desktop/build (or wherever the
 * electron-builder `extraResources` points) as a self-contained exe.
 */
function startBackend(): void {
  if (!app.isPackaged) return

  const exePath = join(process.resourcesPath, 'backend', 'HSMS.API.exe')
  if (!existsSync(exePath)) {
    console.warn(`[hsms] Bundled API not found at ${exePath}; skipping backend start.`)
    return
  }

  backendProcess = spawn(exePath, [], {
    cwd: join(process.resourcesPath, 'backend'),
    env: {
      ...process.env,
      ASPNETCORE_URLS: 'http://localhost:5146',
      ASPNETCORE_ENVIRONMENT: 'Production',
      // Writable per-user folder for the SQLite database + backups, so the app
      // never writes inside the read-only install directory.
      Hsms__DataDirectory: app.getPath('userData')
    },
    stdio: 'ignore',
    windowsHide: true
  })

  backendProcess.on('exit', (code) => {
    console.log(`[hsms] Backend exited with code ${code}`)
    backendProcess = null
  })
}

/** Polls the API health endpoint until it responds or the timeout elapses. */
async function waitForBackend(timeoutMs = 30_000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch('http://localhost:5146/api/health')
      if (response.ok) return
    } catch {
      // API not up yet — keep polling.
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  console.warn('[hsms] Backend did not become healthy in time; showing window anyway.')
}

function stopBackend(): void {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill()
    backendProcess = null
  }
}

/** Absolute path to the bundled splash document (packaged vs dev). */
function splashHtmlPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'splash', 'splash.html')
    : join(app.getAppPath(), 'resources', 'splash', 'splash.html')
}

/**
 * A frameless splash window that plays the branded startup animation while the
 * bundled API boots. Shown instantly on launch, closed once the main window is
 * ready — so the user never stares at an empty screen during the health wait.
 */
function createSplash(): BrowserWindow {
  const splash = new BrowserWindow({
    width: 480,
    height: 480,
    frame: false,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#0c2415',
    title: 'Omni POS',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  splash.once('ready-to-show', () => splash.show())
  void splash.loadFile(splashHtmlPath())
  return splash
}

function createWindow(splash?: BrowserWindow): void {
  // In dev the exe icon isn't embedded yet, so point the window at the PNG.
  const devIcon = join(app.getAppPath(), 'build', 'icon.png')

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    title: 'Omni POS',
    icon: app.isPackaged ? undefined : devIcon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.once('ready-to-show', () => {
    if (splash && !splash.isDestroyed()) splash.close()
    mainWindow.show()
  })

  // Open external links in the system browser, never inside the app window.
  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Surface load failures to the terminal instead of a silent white screen.
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[hsms] Renderer failed to load: ${errorCode} ${errorDescription} (${validatedURL})`)
  })

  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl)
    // Auto-open DevTools in development so errors are visible.
    mainWindow.webContents.openDevTools({ mode: 'right' })
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  // Show the splash immediately so launch feels instant, then boot the API.
  const splash = createSplash()
  startBackend()
  // In the packaged app, wait for the bundled API before loading the UI so the
  // first screen has data instead of connection errors.
  if (app.isPackaged) {
    await waitForBackend()
  }
  createWindow(splash)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopBackend()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', stopBackend)
