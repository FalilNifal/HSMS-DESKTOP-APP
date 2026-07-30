import { useMemo, useState } from 'react'
import {
  Alert,
  Card,
  Center,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  Title
} from '@mantine/core'
import { IconAlertTriangle, IconSearch } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { listStockLogs } from '../api/stocklogs'
import StockLogTable from '../components/stock/StockLogTable'

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10)
}

const now = new Date()
const DEFAULT_FROM = toDateInput(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30))
const DEFAULT_TO = toDateInput(now)

export default function StockHistoryPage(): JSX.Element {
  const [fromDate, setFromDate] = useState(DEFAULT_FROM)
  const [toDate, setToDate] = useState(DEFAULT_TO)
  const [search, setSearch] = useState('')

  const logsQuery = useQuery({
    queryKey: ['stock-logs', fromDate, toDate],
    queryFn: () => listStockLogs(fromDate, toDate)
  })

  const logs = useMemo(() => {
    const term = search.trim().toLowerCase()
    const all = logsQuery.data ?? []
    if (term.length === 0) return all
    return all.filter(
      (l) =>
        l.productName.toLowerCase().includes(term) ||
        l.sku.toLowerCase().includes(term) ||
        l.reason.toLowerCase().includes(term) ||
        l.changedByUserName.toLowerCase().includes(term)
    )
  }, [logsQuery.data, search])

  return (
    <Stack>
      <div>
        <Title order={2}>Stock History</Title>
        <Text c="dimmed">Every stock change — receipts, sales, returns and stock-takes — with who and when</Text>
      </div>

      <Card withBorder radius="md" padding="sm">
        <Group align="flex-end" gap="md">
          <TextInput
            type="date"
            label="From"
            value={fromDate}
            onChange={(e) => setFromDate(e.currentTarget.value)}
          />
          <TextInput
            type="date"
            label="To"
            value={toDate}
            onChange={(e) => setToDate(e.currentTarget.value)}
          />
          <TextInput
            label="Search"
            placeholder="Product, SKU, reason or user…"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1, minWidth: 220 }}
          />
        </Group>
      </Card>

      <Card withBorder radius="md" padding={0}>
        {logsQuery.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : logsQuery.isError ? (
          <Alert color="red" icon={<IconAlertTriangle size={18} />} m="md">
            Failed to load stock history.
          </Alert>
        ) : logs.length === 0 ? (
          <Center py={48}>
            <Text c="dimmed">No stock movements in this period.</Text>
          </Center>
        ) : (
          <StockLogTable logs={logs} />
        )}
      </Card>

      {logs.length > 0 && (
        <Group justify="flex-end">
          <Text size="sm" c="dimmed">
            {logs.length} movement{logs.length > 1 ? 's' : ''}
          </Text>
        </Group>
      )}
    </Stack>
  )
}
