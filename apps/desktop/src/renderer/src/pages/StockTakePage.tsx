import { useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  NumberInput,
  Stack,
  Table,
  Text,
  TextInput,
  Title
} from '@mantine/core'
import { IconAlertTriangle, IconClipboardCheck, IconSearch } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import { applyStockTake, listProducts, type StockTakeResult } from '../api/products'

export default function StockTakePage(): JSX.Element {
  const queryClient = useQueryClient()
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: listProducts })

  const [search, setSearch] = useState('')
  // Counted quantities keyed by product id. Absent = not yet counted (shown as system qty placeholder).
  const [counts, setCounts] = useState<Record<number, number | string>>({})
  const [lastResult, setLastResult] = useState<StockTakeResult | null>(null)

  const products = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (productsQuery.data ?? [])
      .filter((p) => p.isActive)
      .filter((p) =>
        term.length === 0
          ? true
          : p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)
      )
  }, [productsQuery.data, search])

  const changes = useMemo(() => {
    const all = productsQuery.data ?? []
    return all
      .filter((p) => {
        const raw = counts[p.id]
        if (raw === undefined || raw === '') return false
        return Number(raw) !== p.stockQuantity
      })
      .map((p) => ({
        productId: p.id,
        countedQuantity: Number(counts[p.id]),
        variance: Number(counts[p.id]) - p.stockQuantity
      }))
  }, [counts, productsQuery.data])

  const mutation = useMutation({
    mutationFn: () => applyStockTake(changes.map((c) => ({ productId: c.productId, countedQuantity: c.countedQuantity }))),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      setCounts({})
      setLastResult(result)
      notifications.show({
        color: 'teal',
        message: `Stock-take applied — ${result.adjustedCount} product(s) adjusted.`
      })
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not apply the stock-take.'
      })
    }
  })

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Stock-take</Title>
        <Button
          leftSection={<IconClipboardCheck size={18} />}
          disabled={changes.length === 0}
          loading={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          Apply {changes.length > 0 ? `(${changes.length})` : ''}
        </Button>
      </Group>

      <Text c="dimmed" size="sm">
        Enter the physically counted quantity for each item. Only rows that differ from the system
        count are adjusted, and every change is written to the stock log.
      </Text>

      {lastResult && lastResult.adjustedCount > 0 && (
        <Alert color="teal" title={`Last reconciliation: ${lastResult.adjustedCount} adjusted`} withCloseButton onClose={() => setLastResult(null)}>
          <Group gap="xs">
            {lastResult.variances.slice(0, 12).map((v) => (
              <Badge key={v.productId} variant="light" color={v.variance < 0 ? 'red' : 'green'}>
                {v.name}: {v.variance > 0 ? '+' : ''}
                {v.variance}
              </Badge>
            ))}
          </Group>
        </Alert>
      )}

      <TextInput
        placeholder="Search products by name or SKU…"
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        maw={420}
      />

      <Card withBorder radius="md" padding={0}>
        {productsQuery.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : productsQuery.isError ? (
          <Alert color="red" icon={<IconAlertTriangle size={18} />} m="md">
            Failed to load products.
          </Alert>
        ) : products.length === 0 ? (
          <Center py={48}>
            <Text c="dimmed">No products match your search.</Text>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={640}>
            <Table verticalSpacing="sm" horizontalSpacing="md" stickyHeader>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Product</Table.Th>
                  <Table.Th>SKU</Table.Th>
                  <Table.Th ta="center">System</Table.Th>
                  <Table.Th ta="center">Counted</Table.Th>
                  <Table.Th ta="center">Variance</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {products.map((p) => {
                  const raw = counts[p.id]
                  const counted = raw === undefined || raw === '' ? null : Number(raw)
                  const variance = counted === null ? null : counted - p.stockQuantity
                  return (
                    <Table.Tr key={p.id}>
                      <Table.Td>
                        <Text fw={500}>{p.name}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {p.sku}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="center">{p.stockQuantity}</Table.Td>
                      <Table.Td ta="center">
                        <NumberInput
                          size="xs"
                          w={90}
                          min={0}
                          allowDecimal={false}
                          placeholder={String(p.stockQuantity)}
                          value={raw ?? ''}
                          onChange={(v) => setCounts((prev) => ({ ...prev, [p.id]: v }))}
                          styles={{ input: { textAlign: 'center' } }}
                        />
                      </Table.Td>
                      <Table.Td ta="center">
                        {variance === null || variance === 0 ? (
                          <Text c="dimmed">—</Text>
                        ) : (
                          <Badge variant="light" color={variance < 0 ? 'red' : 'green'}>
                            {variance > 0 ? '+' : ''}
                            {variance}
                          </Badge>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  )
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>
    </Stack>
  )
}
