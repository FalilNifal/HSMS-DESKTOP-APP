import { useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title
} from '@mantine/core'
import { IconAlertTriangle, IconPlus, IconReceiptRefund } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import { listReturns } from '../api/returns'
import { formatDateTime, formatMoney } from '../lib/format'
import NewReturnModal from '../components/returns/NewReturnModal'

export default function ReturnsPage(): JSX.Element {
  const returnsQuery = useQuery({ queryKey: ['returns'], queryFn: () => listReturns() })
  const [modalOpen, setModalOpen] = useState(false)

  const returns = returnsQuery.data ?? []
  const totalRefunded = useMemo(
    () => returns.reduce((sum, r) => sum + r.totalRefund, 0),
    [returns]
  )

  return (
    <Stack className="hsms-animate-in">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Returns &amp; Refunds</Title>
          <Text c="dimmed">Process customer returns — items go back into stock automatically</Text>
        </div>
        <Button leftSection={<IconPlus size={18} />} onClick={() => setModalOpen(true)}>
          New return
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 2 }} spacing="sm" maw={440}>
        <Card withBorder radius="md" padding="md">
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.03em' }}>
            Returns
          </Text>
          <Text fz={24} fw={700} mt={4}>
            {returns.length}
          </Text>
        </Card>
        <Card
          withBorder
          radius="md"
          padding="md"
          style={{ borderTop: '3px solid var(--mantine-color-blue-6)' }}
        >
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.03em' }}>
            Total refunded
          </Text>
          <Text fz={24} fw={700} mt={4} c="blue">
            {formatMoney(totalRefunded)}
          </Text>
        </Card>
      </SimpleGrid>

      {returnsQuery.isError && (
        <Alert color="red" icon={<IconAlertTriangle size={18} />}>
          {returnsQuery.error instanceof ApiError ? returnsQuery.error.message : 'Failed to load returns.'}
        </Alert>
      )}

      <Card withBorder padding={0} radius="md">
        {returnsQuery.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : returns.length === 0 ? (
          <Center py={48}>
            <Stack align="center" gap="xs">
              <IconReceiptRefund size={40} opacity={0.5} />
              <Text c="dimmed">No returns yet. Use “New return” to process one.</Text>
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={760}>
            <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Return #</Table.Th>
                  <Table.Th>Invoice</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Processed by</Table.Th>
                  <Table.Th ta="center">Items</Table.Th>
                  <Table.Th>Reason</Table.Th>
                  <Table.Th ta="right">Refund</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {returns.map((record) => (
                  <Table.Tr key={record.id}>
                    <Table.Td>
                      <Text fw={500} size="sm">
                        {record.returnNumber}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {record.invoiceNumber}
                      </Text>
                    </Table.Td>
                    <Table.Td>{formatDateTime(record.createdAt)}</Table.Td>
                    <Table.Td>{record.processedByUserName}</Table.Td>
                    <Table.Td ta="center">
                      <Badge variant="light">
                        {record.items.reduce((sum, item) => sum + item.quantity, 0)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" lineClamp={1}>
                        {record.reason || '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text fw={600}>{formatMoney(record.totalRefund)}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>

      <NewReturnModal opened={modalOpen} onClose={() => setModalOpen(false)} />
    </Stack>
  )
}
