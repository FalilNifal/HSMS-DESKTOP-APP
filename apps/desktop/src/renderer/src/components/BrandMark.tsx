interface BrandMarkProps {
  size?: number
}

/** The "JH" (Janatha Hardware) brand badge — a blue gradient monogram tile. */
export default function BrandMark({ size = 34 }: BrandMarkProps): JSX.Element {
  return (
    <div
      aria-label="Janatha Hardware"
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--mantine-radius-md)',
        background:
          'linear-gradient(135deg, var(--mantine-color-blue-5), var(--mantine-color-blue-8))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 800,
        fontSize: Math.round(size * 0.42),
        letterSpacing: '0.02em',
        boxShadow: 'var(--mantine-shadow-sm)',
        flexShrink: 0
      }}
    >
      JH
    </div>
  )
}
