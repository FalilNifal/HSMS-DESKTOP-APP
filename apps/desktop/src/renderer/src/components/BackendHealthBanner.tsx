import { Box, Group, Loader, Text } from '@mantine/core'
import { IconPlugConnectedX } from '@tabler/icons-react'
import { useBackendHealth } from '../hooks/useBackendHealth'

/**
 * A slim fixed banner shown only when the backend API is unreachable.
 * Renders nothing while the server is healthy.
 */
export default function BackendHealthBanner(): JSX.Element | null {
  const online = useBackendHealth()

  if (online) return null

  return (
    <Box
      className="no-print"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 2000,
        backgroundColor: 'var(--mantine-color-red-7)',
        color: 'white',
        padding: '6px 12px'
      }}
    >
      <Group justify="center" gap="xs">
        <IconPlugConnectedX size={18} />
        <Text size="sm" fw={500}>
          Can’t reach the HSMS server. Make sure the backend is running — it will reconnect automatically.
        </Text>
        <Loader size="xs" color="white" />
      </Group>
    </Box>
  )
}
