import { Badge, Button, Center, Group, Loader, Modal, Stack, Table, Text } from '@mantine/core'
import { IconCash } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { getCustomerLedger, type Customer } from '../../api/customers'
import { formatDateTime, formatMoney } from '../../lib/format'

interface CustomerLedgerModalProps {
  customer: Customer | null
  onClose: () => void
  onRecordPayment: (customer: Customer) => void
}

export default function CustomerLedgerModal({
  customer,
  onClose,
  onRecordPayment
}: CustomerLedgerModalProps): JSX.Element {
  const ledgerQuery = useQuery({
    queryKey: ['customer-ledger', customer?.id],
    queryFn: () => getCustomerLedger(customer!.id),
    enabled: customer !== null
  })

  const ledger = ledgerQuery.data
  const balance = ledger?.outstandingBalance ?? customer?.outstandingBalance ?? 0

  return (
    <Modal
      opened={customer !== null}
      onClose={onClose}
      title={customer ? `Statement — ${customer.name}` : 'Statement'}
      size="lg"
      centered
    >
      <Stack>
        <Group justify="space-between" align="flex-start">
          <div>
            <Text size="sm" c="dimmed">
              Outstanding balance
            </Text>
            <Text fz={28} fw={800} c={balance > 0 ? 'red' : balance < 0 ? 'teal' : undefined}>
              {formatMoney(balance)}
            </Text>
            {balance < 0 && (
              <Text size="xs" c="dimmed">
                Advance / credit in customer&apos;s favour
              </Text>
            )}
          </div>
          {customer && (
            <Button leftSection={<IconCash size={18} />} onClick={() => onRecordPayment(customer)}>
              Record payment
            </Button>
          )}
        </Group>

        {ledgerQuery.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : !ledger?.entries.length ? (
          <Center py="lg">
            <Text c="dimmed">No credit sales or payments yet.</Text>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={560}>
            <Table verticalSpacing="xs" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Reference</Table.Th>
                  <Table.Th ta="right">Charge</Table.Th>
                  <Table.Th ta="right">Payment</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {ledger.entries.map((entry, index) => (
                  <Table.Tr key={index}>
                    <Table.Td>{formatDateTime(entry.date)}</Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={entry.type === 'Payment' ? 'teal' : 'orange'}>
                        {entry.type}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {entry.reference}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">{entry.charge > 0 ? formatMoney(entry.charge) : '—'}</Table.Td>
                    <Table.Td ta="right">{entry.payment > 0 ? formatMoney(entry.payment) : '—'}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Stack>
    </Modal>
  )
}
