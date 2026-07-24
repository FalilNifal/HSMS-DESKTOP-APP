import { useState } from 'react'
import {
  ActionIcon,
  Alert,
  Badge,
  Card,
  Center,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip
} from '@mantine/core'
import { IconAlertTriangle, IconPrinter, IconReceiptRefund, IconSearch } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import { getInvoice, listSales } from '../api/sales'
import { printInvoice } from '../lib/printReceipt'
import { formatDateTime, formatMoney } from '../lib/format'
import { useCurrentUser } from '../store/authStore'
import NewReturnModal from '../components/returns/NewReturnModal'

function toDateInput(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const now = new Date()
const DEFAULT_FROM = toDateInput(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7))
const DEFAULT_TO = toDateInput(now)

export default function SalesHistoryPage(): JSX.Element {
  const [fromDate, setFromDate] = useState(DEFAULT_FROM)
  const [toDate, setToDate] = useState(DEFAULT_TO)
  const [invoice, setInvoice] = useState('')
  const [returnInvoice, setReturnInvoice] = useState<string | null>(null)
  const user = useCurrentUser()
  const canReturn = user?.role === 'Admin' || user?.role === 'Manager'

  const salesQuery = useQuery({
    queryKey: ['sales', fromDate, toDate, invoice],
    queryFn: () => listSales(fromDate, toDate, invoice.trim() || undefined)
  })

  const reprintMutation = useMutation({
    mutationFn: (saleId: number) => getInvoice(saleId),
    onSuccess: (inv) => printInvoice(inv),
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not load the invoice.'
      })
    }
  })

  const sales = salesQuery.data ?? []
  const totalValue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0)

  return (
    <Stack className="hsms-animate-in">
      <div>
        <Title order={2}>Sales History</Title>
        <Text c="dimmed">Browse past sales and reprint any bill</Text>
      </div>

      <Card withBorder radius="md" padding="sm">
        <Group align="flex-end" gap="md">
          <TextInput type="date" label="From" value={fromDate} onChange={(e) => setFromDate(e.currentTarget.value)} />
          <TextInput type="date" label="To" value={toDate} onChange={(e) => setToDate(e.currentTarget.value)} />
          <TextInput
            label="Invoice number"
            placeholder="Search invoice…"
            leftSection={<IconSearch size={16} />}
            value={invoice}
            onChange={(e) => setInvoice(e.currentTarget.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
        </Group>
      </Card>

      {salesQuery.isError && (
        <Alert color="red" icon={<IconAlertTriangle size={18} />}>
          Failed to load sales.
        </Alert>
      )}

      <Card withBorder padding={0} radius="md">
        {salesQuery.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : sales.length === 0 ? (
          <Center py={48}>
            <Text c="dimmed">No sales in this period.</Text>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={780}>
            <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Invoice</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Cashier</Table.Th>
                  <Table.Th>Payment</Table.Th>
                  <Table.Th ta="center">Items</Table.Th>
                  <Table.Th ta="right">Total</Table.Th>
                  <Table.Th ta="right">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {sales.map((sale) => (
                  <Table.Tr key={sale.id}>
                    <Table.Td>
                      <Text fw={500} size="sm">
                        {sale.invoiceNumber}
                      </Text>
                    </Table.Td>
                    <Table.Td>{formatDateTime(sale.createdAt)}</Table.Td>
                    <Table.Td>{sale.soldByUserName}</Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={sale.paymentMethod === 'Credit' ? 'orange' : 'gray'}>
                        {sale.paymentMethod}
                      </Badge>
                    </Table.Td>
                    <Table.Td ta="center">{sale.items.reduce((s, i) => s + i.quantity, 0)}</Table.Td>
                    <Table.Td ta="right">
                      <Text fw={600}>{formatMoney(sale.totalAmount)}</Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <Tooltip label="Reprint bill">
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            loading={reprintMutation.isPending && reprintMutation.variables === sale.id}
                            onClick={() => reprintMutation.mutate(sale.id)}
                          >
                            <IconPrinter size={18} />
                          </ActionIcon>
                        </Tooltip>
                        {canReturn && (
                          <Tooltip label="Return / refund items from this bill">
                            <ActionIcon
                              variant="subtle"
                              color="orange"
                              onClick={() => setReturnInvoice(sale.invoiceNumber)}
                            >
                              <IconReceiptRefund size={18} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>

      {sales.length > 0 && (
        <Group justify="flex-end">
          <Text size="sm" c="dimmed">
            {sales.length} sale{sales.length > 1 ? 's' : ''} · total {formatMoney(totalValue)}
          </Text>
        </Group>
      )}

      {canReturn && (
        <NewReturnModal
          opened={returnInvoice !== null}
          initialInvoice={returnInvoice ?? undefined}
          onClose={() => setReturnInvoice(null)}
        />
      )}
    </Stack>
  )
}
