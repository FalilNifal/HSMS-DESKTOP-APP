import { Badge, Table, Text } from '@mantine/core'
import { formatDateTime } from '../../lib/format'
import type { StockLog } from '../../api/stocklogs'

interface StockLogTableProps {
  logs: StockLog[]
  /** Hide the product column (e.g. in a per-product view). */
  showProduct?: boolean
  minWidth?: number
}

export default function StockLogTable({
  logs,
  showProduct = true,
  minWidth = 720
}: StockLogTableProps): JSX.Element {
  return (
    <Table.ScrollContainer minWidth={minWidth}>
      <Table verticalSpacing="sm" horizontalSpacing="md" stickyHeader>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Date</Table.Th>
            {showProduct && <Table.Th>Product</Table.Th>}
            <Table.Th ta="center">Change</Table.Th>
            <Table.Th ta="center">Result</Table.Th>
            <Table.Th>Reason</Table.Th>
            <Table.Th>By</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {logs.map((log) => (
            <Table.Tr key={log.id}>
              <Table.Td>
                <Text size="sm">{formatDateTime(log.createdAt)}</Text>
              </Table.Td>
              {showProduct && (
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {log.productName}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {log.sku}
                  </Text>
                </Table.Td>
              )}
              <Table.Td ta="center">
                <Badge variant="light" color={log.changeAmount < 0 ? 'red' : 'green'}>
                  {log.changeAmount > 0 ? '+' : ''}
                  {log.changeAmount}
                </Badge>
              </Table.Td>
              <Table.Td ta="center">
                <Text size="sm" c="dimmed">
                  {log.oldQuantity} → <b style={{ color: 'var(--mantine-color-text)' }}>{log.newQuantity}</b>
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" lineClamp={1}>
                  {log.reason || '—'}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{log.changedByUserName || '—'}</Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
