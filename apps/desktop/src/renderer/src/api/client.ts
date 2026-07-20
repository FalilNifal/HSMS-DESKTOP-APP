import { useAuthStore } from '../store/authStore'

// In dev the Vite proxy forwards /api -> http://localhost:5146 (same-origin),
// avoiding CORS + the API's HTTPS redirect. In the packaged app the renderer
// loads from file:// and must call the local API directly.
const API_BASE = import.meta.env.DEV ? '' : 'http://localhost:5146'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  auth?: boolean
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  if (auth) {
    const token = useAuthStore.getState().token
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  } catch {
    throw new ApiError(
      'Cannot reach the server. Make sure the HSMS backend is running.',
      0
    )
  }

  // A 401 means the session is gone/expired — clear it so the UI can redirect.
  if (response.status === 401 && auth) {
    useAuthStore.getState().logout()
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  const data = text ? safeJsonParse(text) : null

  if (!response.ok) {
    throw new ApiError(extractErrorMessage(data, response.status), response.status)
  }

  return data as T
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function extractErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>

    if (typeof record.message === 'string') return record.message

    // ASP.NET model-validation ProblemDetails: { errors: { Field: [msg] } }
    if (record.errors && typeof record.errors === 'object') {
      const firstGroup = Object.values(record.errors as Record<string, unknown>)[0]
      if (Array.isArray(firstGroup) && typeof firstGroup[0] === 'string') {
        return firstGroup[0]
      }
    }

    if (typeof record.title === 'string') return record.title
  }

  return `Request failed (${status}).`
}
