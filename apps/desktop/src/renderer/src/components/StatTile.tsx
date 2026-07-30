import { Card, Group, Text, ThemeIcon } from '@mantine/core'
import type { Icon as TablerIcon } from '@tabler/icons-react'

interface StatTileProps {
  label: string
  value: string
  /** Optional secondary line under the value. */
  sub?: string
  icon?: TablerIcon
  /** Mantine color name; defaults to the app's accent ("blue" / logo color). */
  color?: string
  /** Entrance-animation stagger, ms. */
  delay?: number
}

/**
 * Polished stat card used across the app: colored top accent, a soft corner glow,
 * a faint watermark icon, and an entrance animation — one consistent look.
 */
export default function StatTile({
  label,
  value,
  sub,
  icon: Icon,
  color = 'blue',
  delay = 0
}: StatTileProps): JSX.Element {
  return (
    <Card
      withBorder
      radius="md"
      padding="lg"
      className="hsms-animate-in hsms-hover-lift"
      style={{
        position: 'relative',
        overflow: 'hidden',
        animationDelay: `${delay}ms`,
        borderTop: `3px solid var(--mantine-color-${color}-6)`
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: -34,
          right: -34,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `var(--mantine-color-${color}-light)`,
          opacity: 0.55,
          pointerEvents: 'none'
        }}
      />
      {Icon && (
        <Icon
          size={104}
          stroke={1}
          aria-hidden
          style={{
            position: 'absolute',
            right: -12,
            bottom: -20,
            opacity: 0.07,
            color: `var(--mantine-color-${color}-7)`,
            pointerEvents: 'none'
          }}
        />
      )}
      <div style={{ position: 'relative' }}>
        <Group justify="space-between" wrap="nowrap">
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.04em' }}>
            {label}
          </Text>
          {Icon && (
            <ThemeIcon variant="light" color={color} size={38} radius="md">
              <Icon size={20} />
            </ThemeIcon>
          )}
        </Group>
        <Text fz={30} fw={700} mt="xs">
          {value}
        </Text>
        {sub && (
          <Text size="xs" c="dimmed" mt={2}>
            {sub}
          </Text>
        )}
      </div>
    </Card>
  )
}
