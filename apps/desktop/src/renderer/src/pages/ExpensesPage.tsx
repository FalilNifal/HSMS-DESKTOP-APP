import { useState } from 'react'
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip
} from '@mantine/core'
import { IconEdit, IconPlus, IconTrash, IconReceiptTax } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import {
  deleteExpense,
  getExpenseSummary,
  listExpenses,
  type Expense
} from '../api/expenses'
import { formatMoney } from '../lib/format'
import ExpenseFormModal from '../components/expenses/ExpenseFormModal'
import StatTile from '../components/StatTile'

function firstOfMonth(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function ExpensesPage(): JSX.Element {
  const queryClient = useQueryClient()
  const [fromDate, setFromDate] = useState(firstOfMonth())
  const [toDate, setToDate] = useState(today())
  const [modalState, setModalState] = useState<{ opened: boolean; expense: Expense | null }>({
    opened: false,
    expense: null
  })
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)

  const expensesQuery = useQuery({
    queryKey: ['expenses', fromDate, toDate],
    queryFn: () => listExpenses(fromDate, toDate)
  })
  const summaryQuery = useQuery({
    queryKey: ['expense-summary', fromDate, toDate],
    queryFn: () => getExpenseSummary(fromDate, toDate)
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteExpense(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['expense-summary'] })
      ])
      setDeleteTarget(null)
      notifications.show({ color: 'gray', message: 'Expense deleted.' })
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not delete the expense.'
      })
    }
  })

  const expenses = expensesQuery.data ?? []
  const summary = summaryQuery.data

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Expenses</Title>
        <Button
          leftSection={<IconPlus size={18} />}
          onClick={() => setModalState({ opened: true, expense: null })}
        >
          Record expense
        </Button>
      </Group>

      <Group gap="sm" align="flex-end">
        <TextInput
          label="From"
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.currentTarget.value)}
        />
        <TextInput
          label="To"
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.currentTarget.value)}
        />
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm">
        <StatTile
          label="Total in range"
          value={summary ? formatMoney(summary.total) : '—'}
          icon={IconReceiptTax}
          color="orange"
        />
        {(summary?.byCategory ?? []).slice(0, 3).map((cat, index) => (
          <StatTile
            key={cat.category}
            label={cat.category}
            value={formatMoney(cat.total)}
            color="gray"
            delay={(index + 1) * 60}
          />
        ))}
      </SimpleGrid>

      <Card withBorder radius="md" padding={0}>
        {expensesQuery.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : expenses.length === 0 ? (
          <Center py={48}>
            <Text c="dimmed">No expenses recorded in this range.</Text>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={720}>
            <Table verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Category</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Payment</Table.Th>
                  <Table.Th ta="right">Amount</Table.Th>
                  <Table.Th ta="right">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {expenses.map((expense) => (
                  <Table.Tr key={expense.id}>
                    <Table.Td>{new Date(expense.expenseDate).toLocaleDateString()}</Table.Td>
                    <Table.Td>
                      <Badge variant="light">{expense.category}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" lineClamp={1}>
                        {expense.description || '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{expense.paymentMethod}</Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text fw={600}>{formatMoney(expense.amount)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <Tooltip label="Edit">
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            onClick={() => setModalState({ opened: true, expense })}
                          >
                            <IconEdit size={18} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon variant="subtle" color="red" onClick={() => setDeleteTarget(expense)}>
                            <IconTrash size={18} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>

      <ExpenseFormModal
        opened={modalState.opened}
        expense={modalState.expense}
        onClose={() => setModalState({ opened: false, expense: null })}
      />

      <Modal
        opened={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete expense"
        centered
        size="sm"
      >
        <Stack>
          <Text size="sm">
            Delete this {deleteTarget ? formatMoney(deleteTarget.amount) : ''}{' '}
            {deleteTarget?.category.toLowerCase()} expense? This cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              color="red"
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
