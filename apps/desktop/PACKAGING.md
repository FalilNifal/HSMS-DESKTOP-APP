# Packaging HSMS Desktop into a Windows installer

This produces a single **`HSMS Desktop-Setup-<version>.exe`** that installs the
whole app — the React UI **and** the .NET API bundled inside — so the shop PC
needs **no** .NET runtime and no separate backend window.

## How it works

- The .NET API is published **self-contained** (its own runtime) into
  `backend/HSMS.API/publish`.
- `electron-builder.yml` ships that folder inside the installer at
  `resources/backend/`.
- On launch, the Electron main process ([src/main/index.ts](src/main/index.ts))
  spawns `resources/backend/HSMS.API.exe`, waits for `/api/health`, then loads
  the UI.
- The database and backups live in a **writable per-user folder**
  (`%APPDATA%\hsms-desktop`), passed to the API via `Hsms__DataDirectory` — never
  inside `Program Files`.

## Prerequisites

- .NET 10 SDK, Node 18+ (tested on 24), and internet access (the first
  self-contained publish downloads the win-x64 runtime; electron-builder
  downloads NSIS the first time).

## Build steps

**1. Publish the backend (self-contained, win-x64):**

```powershell
cd C:\Users\Lenovo\Desktop\HSMS-DESKTOP-APP\HSMS-DESKTOP-APP\backend\HSMS.API
dotnet publish HSMS.API.csproj -c Release -r win-x64 --self-contained true -o publish
```

Confirm `backend\HSMS.API\publish\HSMS.API.exe` exists.

> Optional (smaller, one-file): add `-p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true`.
> It works the same but needs the extra `ILLink.Tasks` package on first run.

**2. Build the installer:**

```powershell
cd C:\Users\Lenovo\Desktop\HSMS-DESKTOP-APP\HSMS-DESKTOP-APP\apps\desktop
npm install          # first time (also downloads the Electron binary)
npm run build:win
```

The installer is written to **`apps\desktop\release\HSMS Desktop-Setup-<version>.exe`**.

**3. Install & run:** double-click the installer. It creates Start-menu and
desktop shortcuts. Launching it starts the API automatically and opens the app.

## Where data lives

| Item | Location |
|---|---|
| Database | `%APPDATA%\hsms-desktop\hsms_desktop.db` |
| Backups | `%APPDATA%\hsms-desktop\backups\` |
| App files | the install folder you chose (read-only at runtime) |

Uninstalling removes the app but **leaves the data folder** so a reinstall keeps
your products/sales. Delete `%APPDATA%\hsms-desktop` manually for a clean wipe.

## Known follow-ups (not blockers)

- **Unsigned build:** Windows SmartScreen will show a "unknown publisher"
  warning on first run. Buying a code-signing certificate removes it.
- **App icon:** currently the default Electron icon. Add `build/icon.ico` and
  reference it in `electron-builder.yml` (`win.icon`) to brand it.
- **JWT key:** `appsettings.json` ships a shared dev key. For a hardened build,
  generate a per-install key (part of the security-hardening pass).
- **Auto-update:** not configured. electron-builder supports it later if wanted.

## Troubleshooting

- **App opens but shows the red "can't reach server" banner** → the bundled
  `HSMS.API.exe` didn't start. Temporarily set `stdio: 'inherit'` in
  `startBackend` (main process), rebuild, and watch its console output.
- **`npm run build:win` fails downloading NSIS/winCodeSign** → network/proxy
  blocking GitHub; retry on an open connection.
- **Publish fails restoring packages** → nuget.org unreachable; retry with
  internet access.
