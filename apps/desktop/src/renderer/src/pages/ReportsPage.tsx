import { useState } from 'react'
import {
  Button,
  Card,
  Center,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Title
} from '@mantine/core'
import {
  IconCash,
  IconTrendingUp,
  IconReceipt2,
  IconPercentage,
  IconDownload,
  IconChartBar,
  IconUsers,
  IconAlertHexagon,
  IconTimeline,
  IconTruckLoading,
  IconArchive
} from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import {
  getCashierSales,
  getDateRangeSales,
  getDeadStock,
  getLowStock,
  getProductSales,
  getReorder,
  getSalesTrend
} from '../api/reports'
import { listCategories } from '../api/catalog'
import { formatInteger, formatMoney } from '../lib/format'
import { downloadCsv } from '../lib/csv'
import SalesTrendChart from '../components/reports/SalesTrendChart'

function toDateInput(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const now = new Date()
const DEFAULT_FROM = toDateInput(new Date(now.getFullYear(), now.getMonth(), 1))
const DEFAULT_TO = toDateInput(now)

export default function ReportsPage(): JSX.Element {
  const [fromDate, setFromDate] = useState(DEFAULT_FROM)
  const [toDate, setToDate] = useState(DEFAULT_TO)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [deadStockDays, setDeadStockDays] = useState('30')

  const summaryQuery = useQuery({
    queryKey: ['report-summary', fromDate, toDate],
    queryFn: () => getDateRangeSales(fromDate, toDate)
  })
  const trendQuery = useQuery({
    queryKey: ['report-trend', fromDate, toDate],
    queryFn: () => getSalesTrend(fromDate, toDate)
  })
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories })
  const productQuery = useQuery({
    queryKey: ['report-products', fromDate, toDate, categoryId],
    queryFn: () => getProductSales(fromDate, toDate, categoryId ? Number(categoryId) : null)
  })
  const cashierQuery = useQuery({
    queryKey: ['report-cashiers', fromDate, toDate],
    queryFn: () => getCashierSales(fromDate, toDate)
  })
  const lowStockQuery = useQuery({ queryKey: ['report-lowstock'], queryFn: getLowStock })
  const reorderQuery = useQuery({ queryKey: ['report-reorder'], queryFn: getReorder })
  const deadStockQuery = useQuery({
    queryKey: ['report-deadstock', deadStockDays],
    queryFn: () => getDeadStock(Number(deadStockDays))
  })

  const summary = summaryQuery.data
  const margin =
    summary && summary.totalSales > 0 ? (summary.totalProfit / summary.totalSales) * 100 : 0

  return (
    <Stack>
      <Title order={2}>Reports</Title>

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
          <Text size="sm" c="dimmed" pb={8}>
            {summaryQuery.isFetching ? 'Loading…' : `Period: ${fromDate} → ${toDate}`}
          </Text>
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <StatTile
          label="Total sales"
          value={formatMoney(summary?.totalSales ?? 0)}
          icon={IconCash}
          color="indigo"
        />
        <StatTile
          label="Total profit"
          value={formatMoney(summary?.totalProfit ?? 0)}
          icon={IconTrendingUp}
          color="teal"
        />
        <StatTile
          label="Orders"
          value={formatInteger(summary?.totalOrders ?? 0)}
          icon={IconReceipt2}
          color="blue"
        />
        <StatTile
          label="Profit margin"
          value={`${margin.toFixed(1)}%`}
          icon={IconPercentage}
          color="grape"
        />
      </SimpleGrid>

      {(summary?.totalRefunds ?? 0) > 0 && (
        <Text size="sm" c="dimmed">
          Refunds: <b>{formatMoney(summary?.totalRefunds ?? 0)}</b> &middot; Net sales:{' '}
          <b>{formatMoney(summary?.netSales ?? 0)}</b> &middot; Net profit:{' '}
          <b>{formatMoney(summary?.netProfit ?? 0)}</b>
        </Text>
      )}

      <Tabs defaultValue="trend">
        <Tabs.List>
          <Tabs.Tab value="trend" leftSection={<IconTimeline size={16} />}>
            Trend
          </Tabs.Tab>
          <Tabs.Tab value="products" leftSection={<IconChartBar size={16} />}>
            By product
          </Tabs.Tab>
          <Tabs.Tab value="cashiers" leftSection={<IconUsers size={16} />}>
            By cashier
          </Tabs.Tab>
          <Tabs.Tab value="lowstock" leftSection={<IconAlertHexagon size={16} />}>
            Low stock
          </Tabs.Tab>
          <Tabs.Tab value="reorder" leftSection={<IconTruckLoading size={16} />}>
            Reorder
          </Tabs.Tab>
          <Tabs.Tab value="deadstock" leftSection={<IconArchive size={16} />}>
            Dead stock
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="trend" pt="md">
          <Card withBorder radius="md" padding="md">
            <Text fw={600} mb="sm">
              Daily sales
            </Text>
            {trendQuery.isLoading ? (
              <Center py="xl">
                <Loader />
              </Center>
            ) : !trendQuery.data?.items.length ? (
              <Center py={40}>
                <Text c="dimmed">No sales in this period.</Text>
              </Center>
            ) : (
              <SalesTrendChart items={trendQuery.data.items} fromDate={fromDate} toDate={toDate} />
            )}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="products" pt="md">
          <Card withBorder radius="md" padding={0}>
            <Group justify="space-between" p="sm">
              <Group gap="sm">
                <Text fw={600}>Sales by product</Text>
                <Select
                  size="xs"
                  placeholder="All categories"
                  clearable
                  w={190}
                  data={(categoriesQuery.data ?? [])
                    .filter((category) => category.isActive)
                    .map((category) => ({ value: String(category.id), label: category.name }))}
                  value={categoryId}
                  onChange={setCategoryId}
                />
              </Group>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconDownload size={14} />}
                disabled={!productQuery.data?.items.length}
                onClick={() =>
                  downloadCsv(
                    `product-sales_${fromDate}_${toDate}.csv`,
                    ['Product', 'SKU', 'Qty sold', 'Total sales', 'Total profit'],
                    (productQuery.data?.items ?? []).map((i) => [
                      i.productName,
                      i.sku,
                      i.quantitySold,
                      i.totalSales,
                      i.totalProfit
                    ])
                  )
                }
              >
                Export CSV
              </Button>
            </Group>
            <ReportTable
              loading={productQuery.isLoading}
              empty={!productQuery.data?.items.length}
              minWidth={640}
              head={['Product', 'SKU', 'Qty sold', 'Total sales', 'Total profit']}
              aligns={['left', 'left', 'right', 'right', 'right']}
              rows={(productQuery.data?.items ?? []).map((i) => [
                i.productName,
                i.sku,
                formatInteger(i.quantitySold),
                formatMoney(i.totalSales),
                formatMoney(i.totalProfit)
              ])}
            />
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="cashiers" pt="md">
          <Card withBorder radius="md" padding={0}>
            <Group justify="space-between" p="sm">
              <Text fw={600}>Sales by cashier</Text>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconDownload size={14} />}
                disabled={!cashierQuery.data?.items.length}
                onClick={() =>
                  downloadCsv(
                    `cashier-sales_${fromDate}_${toDate}.csv`,
                    ['Cashier', 'Orders', 'Total sales', 'Total profit'],
                    (cashierQuery.data?.items ?? []).map((i) => [
                      i.cashierName,
                      i.orderCount,
                      i.totalSales,
                      i.totalProfit
                    ])
                  )
                }
              >
                Export CSV
              </Button>
            </Group>
            <ReportTable
              loading={cashierQuery.isLoading}
              empty={!cashierQuery.data?.items.length}
              minWidth={560}
              head={['Cashier', 'Orders', 'Total sales', 'Total profit']}
              aligns={['left', 'right', 'right', 'right']}
              rows={(cashierQuery.data?.items ?? []).map((i) => [
                i.cashierName,
                formatInteger(i.orderCount),
                formatMoney(i.totalSales),
                formatMoney(i.totalProfit)
              ])}
            />
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="lowstock" pt="md">
          <Card withBorder radius="md" padding={0}>
            <Group justify="space-between" p="sm">
              <Text fw={600}>Low-stock products</Text>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconDownload size={14} />}
                disabled={!lowStockQuery.data?.items.length}
                onClick={() =>
                  downloadCsv(
                    'low-stock.csv',
                    ['Product', 'SKU', 'In stock', 'Alert level'],
                    (lowStockQuery.data?.items ?? []).map((i) => [
                      i.name,
                      i.sku,
                      i.stockQuantity,
                      i.lowStockLevel
                    ])
                  )
                }
              >
                Export CSV
              </Button>
            </Group>
            <ReportTable
              loading={lowStockQuery.isLoading}
              empty={!lowStockQuery.data?.items.length}
              emptyText="No products are low on stock. 🎉"
              minWidth={520}
              head={['Product', 'SKU', 'In stock', 'Alert level']}
              aligns={['left', 'left', 'right', 'right']}
              rows={(lowStockQuery.data?.items ?? []).map((i) => [
                i.name,
                i.sku,
                formatInteger(i.stockQuantity),
                formatInteger(i.lowStockLevel)
              ])}
            />
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="reorder" pt="md">
          <Card withBorder radius="md" padding={0}>
            <Group justify="space-between" p="sm">
              <Text fw={600}>Reorder list (low stock, by supplier)</Text>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconDownload size={14} />}
                disabled={!reorderQuery.data?.items.length}
                onClick={() =>
                  downloadCsv(
                    'reorder-list.csv',
                    ['Supplier', 'Product', 'SKU', 'In stock', 'Alert level', 'Suggested order'],
                    (reorderQuery.data?.items ?? []).map((i) => [
                      i.supplierName,
                      i.name,
                      i.sku,
                      i.stockQuantity,
                      i.lowStockLevel,
                      i.suggestedQuantity
                    ])
                  )
                }
              >
                Export CSV
              </Button>
            </Group>
            <ReportTable
              loading={reorderQuery.isLoading}
              empty={!reorderQuery.data?.items.length}
              emptyText="Nothing to reorder — stock levels are healthy. 🎉"
              minWidth={640}
              head={['Supplier', 'Product', 'SKU', 'In stock', 'Suggested order']}
              aligns={['left', 'left', 'left', 'right', 'right']}
              rows={(reorderQuery.data?.items ?? []).map((i) => [
                i.supplierName,
                i.name,
                i.sku,
                formatInteger(i.stockQuantity),
                formatInteger(i.suggestedQuantity)
              ])}
            />
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="deadstock" pt="md">
          <Card withBorder radius="md" padding={0}>
            <Group justify="space-between" p="sm">
              <Group gap="sm">
                <Text fw={600}>Dead stock</Text>
                <Select
                  size="xs"
                  w={170}
                  data={[
                    { value: '30', label: 'Not sold in 30 days' },
                    { value: '60', label: 'Not sold in 60 days' },
                    { value: '90', label: 'Not sold in 90 days' }
                  ]}
                  value={deadStockDays}
                  onChange={(v) => setDeadStockDays(v ?? '30')}
                  allowDeselect={false}
                />
              </Group>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconDownload size={14} />}
                disabled={!deadStockQuery.data?.items.length}
                onClick={() =>
                  downloadCsv(
                    `dead-stock_${deadStockDays}d.csv`,
                    ['Product', 'SKU', 'In stock', 'Stock value (cost)', 'Last sold'],
                    (deadStockQuery.data?.items ?? []).map((i) => [
                      i.name,
                      i.sku,
                      i.stockQuantity,
                      i.stockValueAtCost,
                      i.lastSoldDate ? new Date(i.lastSoldDate).toLocaleDateString() : 'Never'
                    ])
                  )
                }
              >
                Export CSV
              </Button>
            </Group>
            <ReportTable
              loading={deadStockQuery.isLoading}
              empty={!deadStockQuery.data?.items.length}
              emptyText="No dead stock in this window. 🎉"
              minWidth={620}
              head={['Product', 'SKU', 'In stock', 'Stock value', 'Last sold']}
              aligns={['left', 'left', 'right', 'right', 'right']}
              rows={(deadStockQuery.data?.items ?? []).map((i) => [
                i.name,
                i.sku,
                formatInteger(i.stockQuantity),
                formatMoney(i.stockValueAtCost),
                i.lastSoldDate ? new Date(i.lastSoldDate).toLocaleDateString() : 'Never'
              ])}
            />
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}

function StatTile({
  label,
  value,
  icon: Icon,
  color
}: {
  label: string
  value: string
  icon: typeof IconCash
  color: string
}): JSX.Element {
  return (
    <Card withBorder radius="md" padding="lg">
      <Group justify="space-between">
        <Text size="sm" c="dimmed" fw={500}>
          {label}
        </Text>
        <ThemeIcon variant="light" color={color} size="lg" radius="md">
          <Icon size={20} />
        </ThemeIcon>
      </Group>
      <Text fz={26} fw={700} mt="sm">
        {value}
      </Text>
    </Card>
  )
}

type Align = 'left' | 'right' | 'center'

function ReportTable({
  loading,
  empty,
  emptyText = 'No data for this period.',
  head,
  aligns,
  rows,
  minWidth
}: {
  loading: boolean
  empty: boolean
  emptyText?: string
  head: string[]
  aligns: Align[]
  rows: Array<Array<string | number>>
  minWidth: number
}): JSX.Element {
  if (loading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    )
  }
  if (empty) {
    return (
      <Center py={40}>
        <Text c="dimmed">{emptyText}</Text>
      </Center>
    )
  }
  return (
    <Table.ScrollContainer minWidth={minWidth}>
      <Table verticalSpacing="sm" horizontalSpacing="md">
        <Table.Thead>
          <Table.Tr>
            {head.map((h, i) => (
              <Table.Th key={h} ta={aligns[i]}>
                {h}
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row, rowIndex) => (
            <Table.Tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <Table.Td key={cellIndex} ta={aligns[cellIndex]}>
                  {cell}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
