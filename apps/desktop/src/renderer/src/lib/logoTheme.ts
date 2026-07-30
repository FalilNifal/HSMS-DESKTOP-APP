import type { MantineColorsTuple } from '@mantine/core'

// ---- color conversions -------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
    }
    h *= 60
  }
  return { h, s, l }
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360
  const hue = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  if (s === 0) return [l * 255, l * 255, l * 255]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [hue(p, q, h + 1 / 3) * 255, hue(p, q, h) * 255, hue(p, q, h - 1 / 3) * 255]
}

// ---- public API --------------------------------------------------------------

/** Builds a Mantine 10-shade palette (light → dark) around a base color. */
export function generateShades(hex: string): MantineColorsTuple {
  const { h, s } = rgbToHsl(...hexToRgb(hex))
  const sat = Math.min(0.9, Math.max(0.35, s))
  const lightness = [0.96, 0.9, 0.82, 0.72, 0.61, 0.52, 0.45, 0.38, 0.31, 0.24]
  const shades = lightness.map((l, i) => {
    const ss = i <= 2 ? sat * 0.7 : sat // lighter tints slightly desaturated
    return rgbToHex(...hslToRgb(h, ss, l))
  })
  return shades as unknown as MantineColorsTuple
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Extracts the logo's dominant *vibrant* color (ignoring greys, near-white and
 * near-black), so the app accent matches the brand. Returns a hex or null.
 */
export async function deriveAccentFromLogo(dataUrl: string): Promise<string | null> {
  try {
    const img = await loadImage(dataUrl)
    const size = 48
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, size, size)
    const { data } = ctx.getImageData(0, 0, size, size)

    const buckets = new Map<number, { r: number; g: number; b: number; count: number; score: number }>()
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      if (a < 200) continue
      const { h, s, l } = rgbToHsl(r, g, b)
      if (s < 0.25) continue // grey
      if (l < 0.12 || l > 0.9) continue // near black / white
      const key = Math.round(h / 15) // 15° hue buckets
      const score = s * (1 - Math.abs(l - 0.5)) // vibrant + mid-lightness
      const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0, score: 0 }
      bucket.r += r
      bucket.g += g
      bucket.b += b
      bucket.count += 1
      bucket.score += score
      buckets.set(key, bucket)
    }

    let best: { r: number; g: number; b: number } | null = null
    let bestScore = -1
    for (const bucket of buckets.values()) {
      if (bucket.score > bestScore) {
        bestScore = bucket.score
        best = { r: bucket.r / bucket.count, g: bucket.g / bucket.count, b: bucket.b / bucket.count }
      }
    }
    return best ? rgbToHex(best.r, best.g, best.b) : null
  } catch {
    return null
  }
}
