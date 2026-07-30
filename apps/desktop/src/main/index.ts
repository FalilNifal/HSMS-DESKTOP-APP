import { app, BrowserWindow, ipcMain, screen, shell } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { spawn, ChildProcess } from 'child_process'

// Let the splash video autoplay with sound (trusted local content, desktop app).
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

let backendProcess: ChildProcess | null = null

// The splash closes only once the video has played through once AND the app is
// ready — so the logo animation always finishes before jumping to the dashboard.
let splashWin: BrowserWindow | null = null
let mainWin: BrowserWindow | null = null
let videoEnded = false
let mainReady = false

function finishSplash(): void {
  if (!videoEnded || !mainReady) return
  if (splashWin && !splashWin.isDestroyed()) splashWin.close()
  splashWin = null
  if (mainWin && !mainWin.isDestroyed()) mainWin.show()
}

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
    // Placeholder size shown for the ~100ms before the video's real dimensions
    // arrive; it is then resized to match the video (see the ipc handler below).
    width: 480,
    height: 270,
    frame: false,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    backgroundColor: '#0c2415',
    title: 'Omni POS',
    // The splash loads only our bundled local file (no remote/user content), so
    // nodeIntegration is safe here and lets it report the video size over ipc.
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true
    }
  })

  splashWin = splash

  // Resize the splash to the video's real dimensions, scaled to fit the screen.
  ipcMain.once('splash-size', (_event, size: { w: number; h: number }) => {
    if (splash.isDestroyed() || !size?.w || !size?.h) return
    const { workAreaSize } = screen.getPrimaryDisplay()
    const scale = Math.min(1, (workAreaSize.width * 0.6) / size.w, (workAreaSize.height * 0.6) / size.h)
    splash.setContentSize(Math.round(size.w * scale), Math.round(size.h * scale))
    splash.center()
  })

  // The splash reports when the video has played through once.
  ipcMain.once('splash-ended', () => {
    videoEnded = true
    finishSplash()
  })

  // Safety net: never let the splash hang if the video fails to signal.
  setTimeout(() => {
    videoEnded = true
    finishSplash()
  }, 15000)

  splash.once('ready-to-show', () => splash.show())
  void splash.loadFile(splashHtmlPath())
  return splash
}

function createWindow(): void {
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
    mainWin = mainWindow
    mainReady = true
    finishSplash()
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
  createSplash()
  startBackend()
  // In the packaged app, wait for the bundled API before loading the UI so the
  // first screen has data instead of connection errors.
  if (app.isPackaged) {
    await waitForBackend()
  }
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopBackend()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', stopBackend)
