import {
  Badge,
  Button,
  Card,
  Center,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title
} from '@mantine/core'
import {
  IconCash,
  IconReceipt2,
  IconAlertHexagon,
  IconTrendingUp,
  IconArrowRight,
  IconBuildingWarehouse
} from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../store/authStore'
import { getDailyProfit, getDailySales, getInventoryValue, getLowStock } from '../api/reports'
import { formatInteger, formatMoney } from '../lib/format'

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function DashboardPage(): JSX.Element {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const canSeeProfit = user?.role === 'Admin' || user?.role === 'Manager'
  const date = today()

  const salesQuery = useQuery({ queryKey: ['dashboard-sales', date], queryFn: () => getDailySales(date) })
  const profitQuery = useQuery({
    queryKey: ['dashboard-profit', date],
    queryFn: () => getDailyProfit(date),
    enabled: canSeeProfit
  })
  const lowStockQuery = useQuery({
    queryKey: ['dashboard-lowstock'],
    queryFn: getLowStock,
    enabled: canSeeProfit
  })
  const inventoryQuery = useQuery({
    queryKey: ['inventory-value'],
    queryFn: getInventoryValue,
    enabled: canSeeProfit
  })

  const lowStockItems = lowStockQuery.data?.items ?? []

  const longDate = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <Stack>
      {/* Branded hero — gradient + abstract geometry adopt the shop's accent color. */}
      <Card
        radius="lg"
        padding="xl"
        className="hsms-animate-in"
        style={{
          position: 'relative',
          overflow: 'hidden',
          border: 'none',
          background:
            'linear-gradient(135deg, var(--mantine-primary-color-light), var(--mantine-color-body) 70%)'
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: -50,
            right: -30,
            width: 190,
            height: 190,
            borderRadius: '50%',
            background: 'var(--mantine-primary-color-filled)',
            opacity: 0.12,
            pointerEvents: 'none'
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            bottom: -70,
            right: 110,
            width: 130,
            height: 130,
            borderRadius: '50%',
            background: 'var(--mantine-primary-color-filled)',
            opacity: 0.08,
            pointerEvents: 'none'
          }}
        />
        <div style={{ position: 'relative' }}>
          <Title order={2}>Welcome back, {user?.fullName?.split(' ')[0] ?? 'there'} 👋</Title>
          <Text c="dimmed" mt={4}>
            {longDate} · here is your shop at a glance.
          </Text>
        </div>
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: canSeeProfit ? 4 : 2 }}>
        <StatCard
          label="Today's sales"
          value={formatMoney(salesQuery.data?.totalSales ?? 0)}
          icon={IconCash}
          color="blue"
          delay={0}
        />
        <StatCard
          label="Orders today"
          value={formatInteger(salesQuery.data?.totalOrders ?? 0)}
          icon={IconReceipt2}
          color="cyan"
          delay={70}
        />
        {canSeeProfit && (
          <StatCard
            label="Today's profit"
            value={formatMoney(profitQuery.data?.totalProfit ?? 0)}
            icon={IconTrendingUp}
            color="teal"
            delay={140}
          />
        )}
        {canSeeProfit && (
          <StatCard
            label="Low-stock items"
            value={formatInteger(lowStockItems.length)}
            icon={IconAlertHexagon}
            color={lowStockItems.length > 0 ? 'orange' : 'gray'}
            delay={210}
          />
        )}
      </SimpleGrid>

      {canSeeProfit && (
        <Card withBorder radius="md" padding="lg" className="hsms-animate-in">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <div>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.04em' }}>
                Inventory value (at cost)
              </Text>
              <Text fz={34} fw={800} mt={4}>
                {formatMoney(inventoryQuery.data?.totalCostValue ?? 0)}
              </Text>
              <Text size="sm" c="dimmed" mt={4}>
                {formatInteger(inventoryQuery.data?.totalUnits ?? 0)} units ·{' '}
                {formatInteger(inventoryQuery.data?.productCount ?? 0)} products · retail value{' '}
                {formatMoney(inventoryQuery.data?.totalRetailValue ?? 0)}
              </Text>
            </div>
            <ThemeIcon variant="light" color="blue" size={46} radius="md">
              <IconBuildingWarehouse size={26} />
            </ThemeIcon>
          </Group>
        </Card>
      )}

      {canSeeProfit && (
        <Card withBorder radius="md" padding={0} className="hsms-animate-in">
          <Group justify="space-between" p="md">
            <Group gap="xs">
              <IconAlertHexagon size={20} />
              <Text fw={600}>Low-stock alerts</Text>
              {lowStockItems.length > 0 && (
                <Badge color="orange" variant="light">
                  {lowStockItems.length}
                </Badge>
              )}
            </Group>
            <Button
              size="xs"
              variant="subtle"
              rightSection={<IconArrowRight size={14} />}
              onClick={() => navigate('/products')}
            >
              Manage products
            </Button>
          </Group>

          {lowStockItems.length === 0 ? (
            <Center py="lg">
              <Text c="dimmed" size="sm">
                Everything is well stocked. 🎉
              </Text>
            </Center>
          ) : (
            <Table.ScrollContainer minWidth={420}>
              <Table verticalSpacing="xs" horizontalSpacing="md">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Product</Table.Th>
                    <Table.Th>SKU</Table.Th>
                    <Table.Th ta="center">In stock</Table.Th>
                    <Table.Th ta="center">Alert level</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {lowStockItems.slice(0, 8).map((item) => (
                    <Table.Tr key={item.productId}>
                      <Table.Td>{item.name}</Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {item.sku}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="center">
                        <Badge color="red" variant="filled">
                          {item.stockQuantity}
                        </Badge>
                      </Table.Td>
                      <Table.Td ta="center">{item.lowStockLevel}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          )}
        </Card>
      )}
    </Stack>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  delay = 0
}: {
  label: string
  value: string
  icon: typeof IconCash
  color: string
  delay?: number
}): JSX.Element {
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
      {/* soft corner glow */}
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
      {/* faint watermark icon */}
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
      <div style={{ position: 'relative' }}>
        <Group justify="space-between">
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.04em' }}>
            {label}
          </Text>
          <ThemeIcon variant="light" color={color} size={38} radius="md">
            <Icon size={20} />
          </ThemeIcon>
        </Group>
        <Text fz={32} fw={700} mt="xs">
          {value}
        </Text>
      </div>
    </Card>
  )
}
