import type { HsmsBridge } from './index'

declare global {
  interface Window {
    hsms: HsmsBridge
  }
}

export {}
