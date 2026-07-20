# HSMS Desktop (Electron + React + Mantine)

The desktop shell and UI for the HSMS hardware-store management system. It talks
to the ASP.NET Core API in `../../backend/HSMS.API` over HTTP.

## Stack

- **Electron** + **electron-vite** (build/dev) + **electron-builder** (Windows installer)
- **React 18 + TypeScript**
- **Mantine 7** (UI components)
- **TanStack Query** (server state) · **Zustand** (auth/session) · **React Router** (HashRouter)

## Prerequisites

- Node.js 18+ (tested on 24) and npm
- The .NET 10 SDK, to run the backend API

## Running in development

Open **two terminals**.

**1) Start the backend API** (from `backend/HSMS.API`):

```bash
dotnet run --launch-profile http
# API on http://localhost:5146
```

**2) Start the desktop app** (from `apps/desktop`):

```bash
npm install      # first time only
npm run dev
```

The Electron window opens. In dev, the renderer calls `/api/*` and Vite proxies
it to `http://localhost:5146`, so there are no CORS issues.

### First run

There is no admin yet, so the app opens the **Setup wizard**. Create the shop
profile + admin account, save the one-time **recovery key**, then sign in.

## Other scripts

```bash
npm run typecheck    # TypeScript check (main + renderer)
npm run build        # compile main/preload/renderer into out/
npm run build:win    # build + produce a Windows installer (release/)
```

## Packaging notes (later phase)

- Publish the API self-contained, then enable `extraResources` in
  `electron-builder.yml` so the installer bundles it. The main process
  (`src/main/index.ts` → `startBackend`) already spawns it when packaged.
- Add a runtime Content-Security-Policy via session headers in the main process.
- Backend CORS currently allows only `http://localhost:5173`; widen/adjust it
  for the packaged renderer (`file://`).

## Structure

```
src/
  main/       Electron main process (window + backend sidecar)
  preload/    Context-isolated bridge (window.hsms)
  renderer/   React app
    src/
      api/         fetch client + typed endpoint wrappers
      store/       Zustand auth store
      components/  layout + route guard
      pages/       Setup, Login, Dashboard, placeholders
```
