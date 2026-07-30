import logoUrl from '../assets/logo.png'

interface BrandMarkProps {
  size?: number
  /** Optional shop-uploaded logo (data URL). Falls back to the default Omni POS mark. */
  src?: string | null
}

/** Brand badge — the shop's own logo if set, otherwise the default Omni POS mark. */
export default function BrandMark({ size = 34, src }: BrandMarkProps): JSX.Element {
  return (
    <img
      src={src || logoUrl}
      alt="Shop logo"
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
