import { useMemo, useState } from 'react'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip
} from '@mantine/core'
import {
  IconAlertTriangle,
  IconCash,
  IconEdit,
  IconFileInvoice,
  IconPlus,
  IconRestore,
  IconSearch,
  IconTrash,
  IconUsersGroup
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import {
  deactivateCustomer,
  listCustomers,
  reactivateCustomer,
  type Customer
} from '../api/customers'
import { formatInteger, formatMoney } from '../lib/format'
import CustomerFormModal from '../components/customers/CustomerFormModal'
import RecordPaymentModal from '../components/customers/RecordPaymentModal'
import CustomerLedgerModal from '../components/customers/CustomerLedgerModal'

export default function CustomersPage(): JSX.Element {
  const queryClient = useQueryClient()
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: listCustomers })

  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [formState, setFormState] = useState<{ opened: boolean; customer: Customer | null }>({
    opened: false,
    customer: null
  })
  const [ledgerCustomer, setLedgerCustomer] = useState<Customer | null>(null)
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<Customer | null>(null)

  const deactivateMutation = useMutation({
    mutationFn: (customer: Customer) => deactivateCustomer(customer.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] })
      notifications.show({ color: 'teal', message: 'Customer deactivated.' })
      setDeactivateTarget(null)
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not deactivate the customer.'
      })
    }
  })

  const reactivateMutation = useMutation({
    mutationFn: (customer: Customer) => reactivateCustomer(customer.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] })
      notifications.show({ color: 'teal', message: 'Customer reactivated.' })
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not reactivate the customer.'
      })
    }
  })

  const customers = customersQuery.data ?? []

  const summary = useMemo(() => {
    const owing = customers.filter((c) => c.outstandingBalance > 0)
    return {
      receivables: owing.reduce((sum, c) => sum + c.outstandingBalance, 0),
      owingCount: owing.length
    }
  }, [customers])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return customers
      .filter((c) => (showInactive ? true : c.isActive))
      .filter((c) =>
        term.length === 0
          ? true
          : c.name.toLowerCase().includes(term) || (c.phoneNumber ?? '').toLowerCase().includes(term)
      )
  }, [customers, search, showInactive])

  return (
    <Stack>
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Customers &amp; Credit</Title>
          <Text c="dimmed">Accounts, credit sales (බාකි) and payments</Text>
        </div>
        <Button
          leftSection={<IconPlus size={18} />}
          onClick={() => setFormState({ opened: true, customer: null })}
        >
          Add customer
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 2 }} spacing="sm" maw={440}>
        <Card withBorder radius="md" padding="md" style={{ borderTop: '3px solid var(--mantine-color-red-6)' }}>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.03em' }}>
            Total receivables
          </Text>
          <Text fz={24} fw={700} mt={4} c="red">
            {formatMoney(summary.receivables)}
          </Text>
        </Card>
        <Card withBorder radius="md" padding="md">
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.03em' }}>
            Customers owing
          </Text>
          <Text fz={24} fw={700} mt={4}>
            {formatInteger(summary.owingCount)}
          </Text>
        </Card>
      </SimpleGrid>

      <Group justify="space-between">
        <TextInput
          placeholder="Search by name or phone…"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={320}
        />
        <Switch
          label="Show inactive"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.currentTarget.checked)}
        />
      </Group>

      {customersQuery.isError && (
        <Alert color="red" icon={<IconAlertTriangle size={18} />}>
          Failed to load customers.
        </Alert>
      )}

      <Card withBorder padding={0} radius="md">
        {customersQuery.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : filtered.length === 0 ? (
          <Center py={48}>
            <Stack align="center" gap="xs">
              <IconUsersGroup size={40} opacity={0.5} />
              <Text c="dimmed">
                {customers.length ? 'No customers match your search.' : 'No customers yet.'}
              </Text>
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={780}>
            <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Phone</Table.Th>
                  <Table.Th ta="right">Balance</Table.Th>
                  <Table.Th ta="right">Credit limit</Table.Th>
                  <Table.Th ta="right">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.map((customer) => (
                  <Table.Tr key={customer.id} opacity={customer.isActive ? 1 : 0.55}>
                    <Table.Td>
                      <Group gap={6}>
                        <Text fw={500}>{customer.name}</Text>
                        {!customer.isActive && (
                          <Badge size="xs" color="gray" variant="light">
                            Inactive
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>{customer.phoneNumber ?? '—'}</Table.Td>
                    <Table.Td ta="right">
                      {customer.outstandingBalance > 0 ? (
                        <Badge color="red" variant="light">
                          {formatMoney(customer.outstandingBalance)}
                        </Badge>
                      ) : (
                        <Text c="dimmed">{formatMoney(customer.outstandingBalance)}</Text>
                      )}
                    </Table.Td>
                    <Table.Td ta="right">
                      {customer.creditLimit > 0 ? formatMoney(customer.creditLimit) : 'No limit'}
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <Tooltip label="Statement">
                          <ActionIcon variant="subtle" color="gray" onClick={() => setLedgerCustomer(customer)}>
                            <IconFileInvoice size={18} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Record payment">
                          <ActionIcon variant="subtle" color="teal" onClick={() => setPaymentCustomer(customer)}>
                            <IconCash size={18} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Edit">
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            onClick={() => setFormState({ opened: true, customer })}
                          >
                            <IconEdit size={18} />
                          </ActionIcon>
                        </Tooltip>
                        {customer.isActive ? (
                          <Tooltip label="Deactivate">
                            <ActionIcon variant="subtle" color="red" onClick={() => setDeactivateTarget(customer)}>
                              <IconTrash size={18} />
                            </ActionIcon>
                          </Tooltip>
                        ) : (
                          <Tooltip label="Reactivate">
                            <ActionIcon
                              variant="subtle"
                              color="green"
                              loading={
                                reactivateMutation.isPending &&
                                reactivateMutation.variables?.id === customer.id
                              }
                              onClick={() => reactivateMutation.mutate(customer)}
                            >
                              <IconRestore size={18} />
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

      <CustomerFormModal
        opened={formState.opened}
        customer={formState.customer}
        onClose={() => setFormState({ opened: false, customer: null })}
      />

      <RecordPaymentModal customer={paymentCustomer} onClose={() => setPaymentCustomer(null)} />

      <CustomerLedgerModal
        customer={ledgerCustomer}
        onClose={() => setLedgerCustomer(null)}
        onRecordPayment={(customer) => {
          setLedgerCustomer(null)
          setPaymentCustomer(customer)
        }}
      />

      <Modal
        opened={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        title="Deactivate customer"
        centered
      >
        <Stack>
          <Text>
            Deactivate <b>{deactivateTarget?.name}</b>? Their history and balance are kept; they just
            won&apos;t appear for new credit sales.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeactivateTarget(null)}>
              Cancel
            </Button>
            <Button
              color="red"
              loading={deactivateMutation.isPending}
              onClick={() => deactivateTarget && deactivateMutation.mutate(deactivateTarget)}
            >
              Deactivate
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
