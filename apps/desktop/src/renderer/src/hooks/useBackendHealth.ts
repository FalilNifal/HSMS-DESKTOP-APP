import { useEffect, useRef, useState } from 'react'

// Same base resolution as the API client: dev goes through the Vite proxy,
// the packaged app hits the local API directly.
const API_BASE = import.meta.env.DEV ? '' : 'http://localhost:5146'

// Only declare the backend "offline" after this many consecutive failed checks.
// A single slow/dropped ping (GC pause, disk I/O, busy CPU on a slow PC) must
// NOT flash the banner — that produced frequent false alarms.
const FAILURE_THRESHOLD = 3
const REQUEST_TIMEOUT_MS = 8000

/**
 * Polls the backend /api/health endpoint and reports whether it is reachable.
 * Starts optimistic (true), tolerates transient blips, and recovers instantly
 * on the first successful ping.
 */
export function useBackendHealth(intervalMs = 10_000): boolean {
  const [online, setOnline] = useState(true)
  const cancelledRef = useRef(false)
  const failuresRef = useRef(0)

  useEffect(() => {
    cancelledRef.current = false
    failuresRef.current = 0

    const check = async (): Promise<void> => {
      let healthy = false
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
        const response = await fetch(`${API_BASE}/api/health`, {
          cache: 'no-store',
          signal: controller.signal
        })
        clearTimeout(timeout)
        healthy = response.ok
      } catch {
        healthy = false
      }

      if (cancelledRef.current) return

      if (healthy) {
        // Recover immediately on any success.
        failuresRef.current = 0
        setOnline(true)
      } else {
        failuresRef.current += 1
        // Only surface the banner once we've missed several checks in a row.
        if (failuresRef.current >= FAILURE_THRESHOLD) {
          setOnline(false)
        }
      }
    }

    void check()
    const id = setInterval(() => void check(), intervalMs)

    return () => {
      cancelledRef.current = true
      clearInterval(id)
    }
  }, [intervalMs])

  return online
}
