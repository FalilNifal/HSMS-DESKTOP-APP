import logoUrl from '../assets/logo.png'

interface BrandMarkProps {
  size?: number
}

/** The Janatha Hardware brand badge — the shop logo rendered as a rounded tile. */
export default function BrandMark({ size = 34 }: BrandMarkProps): JSX.Element {
  return (
    <img
      src={logoUrl}
      alt="Janatha Hardware"
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--mantine-radius-md)',
        objectFit: 'contain',
        boxShadow: 'var(--mantine-shadow-sm)',
        flexShrink: 0,
        display: 'block'
      }}
    />
  )
}
