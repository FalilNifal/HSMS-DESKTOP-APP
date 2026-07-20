import { contextBridge } from 'electron'

// Minimal, safe bridge exposed to the renderer as `window.hsms`.
// Keep this surface small — the renderer talks to the backend over HTTP,
// so it rarely needs privileged main-process access.
const hsms = {
  platform: process.platform,
  appVersion: process.env.npm_package_version ?? '0.1.0'
}

export type HsmsBridge = typeof hsms

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('hsms', hsms)
  } catch (error) {
    console.error(error)
  }
} else {
  // Fallback when contextIsolation is disabled (not used in this app).
  ;(globalThis as unknown as { hsms: HsmsBridge }).hsms = hsms
}
