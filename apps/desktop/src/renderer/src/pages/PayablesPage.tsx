import { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Center,
  Divider,
  Group,
  Loader,
  Modal,
  NumberInput,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title
} from '@mantine/core'
import { IconCash, IconReceipt2, IconWallet } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import {
  addSupplierBill,
  addSupplierPayment,
  getSupplierLedger,
  listSuppliers,
  type Supplier
} from '../api/catalog'
import { formatMoney } from '../lib/format'

const PAYMENT_METHODS = ['Cash', 'Card', 'Bank transfer', 'Cheque', 'Other']

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function PayablesPage(): JSX.Element {
  const [onlyOwing, setOnlyOwing] = useState('owing')
  const [selected, setSelected] = useState<Supplier | null>(null)

  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: listSuppliers })

  const suppliers = useMemo(() => {
    const all = (suppliersQuery.data ?? []).filter((s) => s.isActive || s.outstandingBalance !== 0)
    return onlyOwing === 'owing' ? all.filter((s) => s.outstandingBalance > 0) : all
  }, [suppliersQuery.data, onlyOwing])

  const totalPayable = useMemo(
    () => (suppliersQuery.data ?? []).reduce((sum, s) => sum + Math.max(0, s.outstandingBalance), 0),
    [suppliersQuery.data]
  )

  return (
    <Stack>
      <Title order={2}>Supplier payables</Title>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <Card withBorder radius="md" padding="md">
          <Group gap="xs">
            <IconWallet size={20} />
            <Text size="sm" c="dimmed">
              Total owed to suppliers
            </Text>
          </Group>
          <Text fw={800} size="xl" mt={4} c={totalPayable > 0 ? 'red' : undefined}>
            {formatMoney(totalPayable)}
          </Text>
        </Card>
      </SimpleGrid>

      <SegmentedControl
        w="fit-content"
        value={onlyOwing}
        onChange={setOnlyOwing}
        data={[
          { value: 'owing', label: 'With balance' },
          { value: 'all', label: 'All suppliers' }
        ]}
      />

      <Card withBorder radius="md" padding={0}>
        {suppliersQuery.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : suppliers.length === 0 ? (
          <Center py={48}>
            <Text c="dimmed">
              {onlyOwing === 'owing' ? 'No outstanding supplier balances. 🎉' : 'No suppliers yet.'}
            </Text>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={640}>
            <Table verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Supplier</Table.Th>
                  <Table.Th>Contact</Table.Th>
                  <Table.Th ta="right">Outstanding</Table.Th>
                  <Table.Th ta="right">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {suppliers.map((s) => (
                  <Table.Tr key={s.id}>
                    <Table.Td>
                      <Text fw={500}>{s.name}</Text>
                      {!s.isActive && (
                        <Badge size="xs" color="gray" variant="outline">
                          Inactive
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {s.contactPerson || s.phoneNumber || '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text fw={700} c={s.outstandingBalance > 0 ? 'red' : 'dimmed'}>
                        {formatMoney(s.outstandingBalance)}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Button size="xs" variant="light" onClick={() => setSelected(s)}>
                        Manage
                      </Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>

      <SupplierLedgerModal supplier={selected} onClose={() => setSelected(null)} />
    </Stack>
  )
}

interface SupplierLedgerModalProps {
  supplier: Supplier | null
  onClose: () => void
}

function SupplierLedgerModal({ supplier, onClose }: SupplierLedgerModalProps): JSX.Element {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState('payment')

  // Bill form
  const [billAmount, setBillAmount] = useState<number | string>(0)
  const [billNumber, setBillNumber] = useState('')
  const [billDate, setBillDate] = useState(today())
  const [billNotes, setBillNotes] = useState('')

  // Payment form
  const [payAmount, setPayAmount] = useState<number | string>(0)
  const [payMethod, setPayMethod] = useState('Cash')
  const [payDate, setPayDate] = useState(today())
  const [payNotes, setPayNotes] = useState('')

  const ledgerQuery = useQuery({
    queryKey: ['supplier-ledger', supplier?.id],
    queryFn: () => getSupplierLedger(supplier!.id),
    enabled: supplier !== null
  })

  const invalidate = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
      queryClient.invalidateQueries({ queryKey: ['supplier-ledger', supplier?.id] })
    ])
  }

  const billMutation = useMutation({
    mutationFn: () =>
      addSupplierBill(supplier!.id, {
        amount: Number(billAmount),
        billNumber: billNumber.trim() || null,
        billDate: billDate || null,
        notes: billNotes.trim() || null
      }),
    onSuccess: async () => {
      await invalidate()
      setBillAmount(0)
      setBillNumber('')
      setBillNotes('')
      notifications.show({ color: 'teal', message: 'Bill added to supplier balance.' })
    },
    onError: (error) =>
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not add the bill.'
      })
  })

  const paymentMutation = useMutation({
    mutationFn: () =>
      addSupplierPayment(supplier!.id, {
        amount: Number(payAmount),
        paymentMethod: payMethod,
        paymentDate: payDate || null,
        notes: payNotes.trim() || null
      }),
    onSuccess: async () => {
      await invalidate()
      setPayAmount(0)
      setPayNotes('')
      notifications.show({ color: 'teal', message: 'Payment recorded.' })
    },
    onError: (error) =>
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not record the payment.'
      })
  })

  const ledger = ledgerQuery.data

  return (
    <Modal
      opened={supplier !== null}
      onClose={onClose}
      title={supplier ? `${supplier.name} — payables` : 'Payables'}
      size="lg"
      centered
    >
      <Stack>
        <Card withBorder radius="md" padding="sm">
          <Group justify="space-between">
            <Text c="dimmed">Outstanding balance</Text>
            <Text fw={800} size="lg" c={(ledger?.outstandingBalance ?? 0) > 0 ? 'red' : 'teal'}>
              {formatMoney(ledger?.outstandingBalance ?? supplier?.outstandingBalance ?? 0)}
            </Text>
          </Group>
        </Card>

        <SegmentedControl
          value={mode}
          onChange={setMode}
          data={[
            { value: 'payment', label: 'Record payment' },
            { value: 'bill', label: 'Add bill' }
          ]}
        />

        {mode === 'payment' ? (
          <Card withBorder radius="md" padding="sm">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <NumberInput
                label="Amount paid"
                min={0}
                decimalScale={2}
                value={payAmount}
                onChange={setPayAmount}
              />
              <Select
                label="Method"
                data={PAYMENT_METHODS}
                value={payMethod}
                onChange={(v) => setPayMethod(v ?? 'Cash')}
                allowDeselect={false}
              />
              <TextInput
                label="Date"
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.currentTarget.value)}
              />
              <TextInput
                label="Note"
                value={payNotes}
                onChange={(e) => setPayNotes(e.currentTarget.value)}
              />
            </SimpleGrid>
            <Group justify="flex-end" mt="sm">
              <Button
                leftSection={<IconCash size={18} />}
                disabled={Number(payAmount) <= 0}
                loading={paymentMutation.isPending}
                onClick={() => paymentMutation.mutate()}
              >
                Record payment
              </Button>
            </Group>
          </Card>
        ) : (
          <Card withBorder radius="md" padding="sm">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <NumberInput
                label="Bill amount"
                min={0}
                decimalScale={2}
                value={billAmount}
                onChange={setBillAmount}
              />
              <TextInput
                label="Bill / invoice #"
                value={billNumber}
                onChange={(e) => setBillNumber(e.currentTarget.value)}
              />
              <TextInput
                label="Date"
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.currentTarget.value)}
              />
              <Textarea
                label="Note"
                autosize
                minRows={1}
                value={billNotes}
                onChange={(e) => setBillNotes(e.currentTarget.value)}
              />
            </SimpleGrid>
            <Group justify="flex-end" mt="sm">
              <Button
                color="orange"
                leftSection={<IconReceipt2 size={18} />}
                disabled={Number(billAmount) <= 0}
                loading={billMutation.isPending}
                onClick={() => billMutation.mutate()}
              >
                Add bill
              </Button>
            </Group>
          </Card>
        )}

        <Divider label="Ledger" labelPosition="left" />

        {ledgerQuery.isLoading ? (
          <Center py="md">
            <Loader size="sm" />
          </Center>
        ) : !ledger || ledger.entries.length === 0 ? (
          <Text c="dimmed" ta="center" py="md" size="sm">
            No bills or payments yet.
          </Text>
        ) : (
          <ScrollArea.Autosize mah={260}>
            <Table verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Reference</Table.Th>
                  <Table.Th ta="right">Amount</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {ledger.entries.map((entry, index) => (
                  <Table.Tr key={index}>
                    <Table.Td>{new Date(entry.date).toLocaleDateString()}</Table.Td>
                    <Table.Td>
                      <Badge color={entry.type === 'Bill' ? 'orange' : 'teal'} variant="light">
                        {entry.type}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{entry.reference || '—'}</Text>
                      {entry.notes && (
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {entry.notes}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text fw={600} c={entry.type === 'Bill' ? 'red' : 'teal'}>
                        {entry.type === 'Bill' ? '+' : '−'}
                        {formatMoney(entry.amount)}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea.Autosize>
        )}
      </Stack>
    </Modal>
  )
}
