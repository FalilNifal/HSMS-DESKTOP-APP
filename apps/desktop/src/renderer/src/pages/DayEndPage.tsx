import { useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Divider,
  Group,
  Loader,
  NumberInput,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title
} from '@mantine/core'
import {
  IconCash,
  IconCashRegister,
  IconCoin,
  IconPrinter,
  IconReceiptRefund,
  IconReceiptTax
} from '@tabler/icons-react'
import StatTile from '../components/StatTile'
import { useQuery } from '@tanstack/react-query'
import { getZReport } from '../api/reports'
import { getShopSettings } from '../api/settings'
import { formatMoney } from '../lib/format'
import { printZReport } from '../lib/printZReport'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function DayEndPage(): JSX.Element {
  const [date, setDate] = useState(today())
  const [openingFloat, setOpeningFloat] = useState<number | string>(0)
  const [countedCash, setCountedCash] = useState<number | string>('')

  const reportQuery = useQuery({ queryKey: ['z-report', date], queryFn: () => getZReport(date) })
  const shopQuery = useQuery({ queryKey: ['shop-settings'], queryFn: getShopSettings })

  const report = reportQuery.data

  const expectedDrawer = useMemo(
    () => (report ? Number(openingFloat || 0) + report.expectedCashInDrawer : 0),
    [report, openingFloat]
  )
  const hasCount = countedCash !== '' && !Number.isNaN(Number(countedCash))
  const variance = hasCount ? Number(countedCash) - expectedDrawer : null

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Day-end / Z-report</Title>
        <Button
          variant="light"
          leftSection={<IconPrinter size={18} />}
          disabled={!report}
          onClick={() =>
            report &&
            printZReport(report, {
              shopName: shopQuery.data?.shopName ?? 'Day-end report',
              openingFloat: Number(openingFloat || 0),
              countedCash: hasCount ? Number(countedCash) : null,
              expectedDrawer,
              variance
            })
          }
        >
          Print
        </Button>
      </Group>

      <Group gap="sm" align="flex-end">
        <TextInput
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.currentTarget.value)}
        />
      </Group>

      {reportQuery.isLoading || !report ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : (
        <>
          <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
            <StatTile
              label="Gross sales"
              value={formatMoney(report.grossSales)}
              sub={`${report.salesCount} sale(s)`}
              icon={IconCash}
              color="blue"
            />
            <StatTile
              label="Tax collected"
              value={formatMoney(report.taxCollected)}
              icon={IconReceiptTax}
              color="grape"
              delay={70}
            />
            <StatTile
              label="Cash sales"
              value={formatMoney(report.cashSales)}
              icon={IconCoin}
              color="teal"
              delay={140}
            />
            <StatTile
              label="Refunds"
              value={formatMoney(report.refundsTotal)}
              sub={`${report.refundsCount} return(s)`}
              icon={IconReceiptRefund}
              color="orange"
              delay={210}
            />
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Card withBorder radius="md" padding="md">
              <Text fw={600} mb="sm">
                Sales by payment method
              </Text>
              {report.salesByMethod.length === 0 ? (
                <Text c="dimmed" size="sm">
                  No sales on this day.
                </Text>
              ) : (
                <Table>
                  <Table.Tbody>
                    {report.salesByMethod.map((m) => (
                      <Table.Tr key={m.method}>
                        <Table.Td>
                          <Badge variant="light">{m.method}</Badge>
                        </Table.Td>
                        <Table.Td ta="center">
                          <Text size="sm" c="dimmed">
                            {m.count}
                          </Text>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Text fw={600}>{formatMoney(m.total)}</Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Card>

            <Card withBorder radius="md" padding="md">
              <Group gap="xs" mb="sm">
                <IconCashRegister size={20} />
                <Text fw={600}>Cash drawer reconciliation</Text>
              </Group>

              <NumberInput
                label="Opening float"
                description="Cash in the drawer at the start of the day"
                min={0}
                decimalScale={2}
                value={openingFloat}
                onChange={setOpeningFloat}
                mb="sm"
              />

              <Stack gap={4}>
                <Line label="Opening float" value={formatMoney(Number(openingFloat || 0))} />
                <Line label="+ Cash sales" value={formatMoney(report.cashSales)} />
                <Line label="+ Cash from customers" value={formatMoney(report.customerPaymentsCash)} />
                <Line label="− Refunds" value={formatMoney(report.refundsTotal)} negative />
                <Line label="− Cash expenses" value={formatMoney(report.expensesCash)} negative />
                <Line
                  label="− Cash paid to suppliers"
                  value={formatMoney(report.supplierPaymentsCash)}
                  negative
                />
              </Stack>

              <Divider my="sm" />
              <Group justify="space-between">
                <Text fw={700}>Expected in drawer</Text>
                <Text fw={800} size="lg">
                  {formatMoney(expectedDrawer)}
                </Text>
              </Group>

              <NumberInput
                label="Counted cash"
                description="What you actually counted in the drawer"
                min={0}
                decimalScale={2}
                value={countedCash}
                onChange={setCountedCash}
                mt="sm"
              />

              {variance !== null && (
                <Alert
                  mt="sm"
                  color={variance === 0 ? 'teal' : variance > 0 ? 'blue' : 'red'}
                  title={
                    variance === 0
                      ? 'Balanced — drawer matches exactly'
                      : variance > 0
                        ? `Over by ${formatMoney(variance)}`
                        : `Short by ${formatMoney(Math.abs(variance))}`
                  }
                >
                  Counted {formatMoney(Number(countedCash))} vs expected {formatMoney(expectedDrawer)}.
                </Alert>
              )}
            </Card>
          </SimpleGrid>
        </>
      )}
    </Stack>
  )
}

function Line({
  label,
  value,
  negative
}: {
  label: string
  value: string
  negative?: boolean
}): JSX.Element {
  return (
    <Group justify="space-between">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text size="sm" c={negative ? 'red' : undefined}>
        {value}
      </Text>
    </Group>
  )
}
