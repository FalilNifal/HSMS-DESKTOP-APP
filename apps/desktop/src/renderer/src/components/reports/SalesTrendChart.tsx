import { Box, Group, Stack, Text, Tooltip } from '@mantine/core'
import { formatMoney } from '../../lib/format'
import type { SalesTrendItem } from '../../api/reports'

interface SalesTrendChartProps {
  items: SalesTrendItem[]
  fromDate: string
  toDate: string
}

const MAX_BAR_HEIGHT = 180

/** Every date (yyyy-mm-dd) from fromDate to toDate inclusive, using local time. */
function eachDay(fromDate: string, toDate: string): string[] {
  const days: string[] = []
  const cursor = new Date(`${fromDate}T00:00:00`)
  const end = new Date(`${toDate}T00:00:00`)
  let guard = 0
  while (cursor <= end && guard < 400) {
    const y = cursor.getFullYear()
    const m = String(cursor.getMonth() + 1).padStart(2, '0')
    const d = String(cursor.getDate()).padStart(2, '0')
    days.push(`${y}-${m}-${d}`)
    cursor.setDate(cursor.getDate() + 1)
    guard += 1
  }
  return days
}

export default function SalesTrendChart({ items, fromDate, toDate }: SalesTrendChartProps): JSX.Element {
  const byDate = new Map(items.map((item) => [item.date.slice(0, 10), item]))
  const days = eachDay(fromDate, toDate)
  const maxSales = Math.max(1, ...days.map((day) => byDate.get(day)?.totalSales ?? 0))
  const dense = days.length > 40
  const labelEvery = Math.max(1, Math.ceil(days.length / 12))

  return (
    <Stack gap={4}>
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <Group
          gap={dense ? 2 : 6}
          align="flex-end"
          wrap="nowrap"
          style={{ height: MAX_BAR_HEIGHT + 22, minWidth: '100%' }}
        >
          {days.map((day, index) => {
            const item = byDate.get(day)
            const sales = item?.totalSales ?? 0
            const barHeight = sales > 0 ? Math.max(3, Math.round((sales / maxSales) * MAX_BAR_HEIGHT)) : 2
            return (
              <Tooltip
                key={day}
                withArrow
                label={
                  <div>
                    <Text size="xs" fw={600}>
                      {day}
                    </Text>
                    <Text size="xs">Sales: {formatMoney(sales)}</Text>
                    <Text size="xs">Profit: {formatMoney(item?.totalProfit ?? 0)}</Text>
                    <Text size="xs">Orders: {item?.orderCount ?? 0}</Text>
                  </div>
                }
              >
                <Stack gap={3} align="center" style={{ flex: dense ? '0 0 12px' : 1, minWidth: 10 }}>
                  <Box
                    style={{
                      height: barHeight,
                      width: '100%',
                      maxWidth: 28,
                      backgroundColor:
                        sales > 0 ? 'var(--mantine-color-indigo-6)' : 'var(--mantine-color-default-border)',
                      borderRadius: 4
                    }}
                  />
                  <Text fz={9} c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                    {index % labelEvery === 0 ? day.slice(5) : ''}
                  </Text>
                </Stack>
              </Tooltip>
            )
          })}
        </Group>
      </div>
      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          {fromDate}
        </Text>
        <Text size="xs" c="dimmed">
          Peak day: {formatMoney(maxSales)}
        </Text>
        <Text size="xs" c="dimmed">
          {toDate}
        </Text>
      </Group>
    </Stack>
  )
}
