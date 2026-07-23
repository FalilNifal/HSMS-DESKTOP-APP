import { useMemo, useState } from 'react'
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Modal,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  Title,
  Tooltip
} from '@mantine/core'
import {
  IconFileInvoice,
  IconPrinter,
  IconReceipt,
  IconPlus,
  IconX
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import {
  cancelQuotation,
  convertQuotation,
  listQuotations,
  type Quotation,
  type QuotationStatus
} from '../api/quotations'
import { listCustomers } from '../api/customers'
import { getShopSettings } from '../api/settings'
import { formatMoney } from '../lib/format'
import { printQuotation } from '../lib/printQuotation'
import QuotationBuilderModal from '../components/quotations/QuotationBuilderModal'
import InvoiceModal from '../components/pos/InvoiceModal'

const PAYMENT_METHODS = ['Cash', 'Card', 'Mobile', 'Credit', 'Other']

const STATUS_COLORS: Record<QuotationStatus, string> = {
  Open: 'blue',
  Converted: 'teal',
  Cancelled: 'gray'
}

export default function QuotationsPage(): JSX.Element {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('Open')
  const [builderOpen, setBuilderOpen] = useState(false)
  const [convertTarget, setConvertTarget] = useState<Quotation | null>(null)
  const [invoiceSaleId, setInvoiceSaleId] = useState<number | null>(null)

  const quotationsQuery = useQuery({
    queryKey: ['quotations', statusFilter],
    queryFn: () => listQuotations(statusFilter === 'All' ? undefined : statusFilter)
  })
  const shopQuery = useQuery({ queryKey: ['shop-settings'], queryFn: getShopSettings })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelQuotation(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['quotations'] })
      notifications.show({ color: 'gray', message: 'Quotation cancelled.' })
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not cancel the quotation.'
      })
    }
  })

  const handlePrint = (quotation: Quotation): void => {
    const shop = shopQuery.data
    printQuotation(quotation, {
      shopName: shop?.shopName ?? 'Quotation',
      address: shop?.address,
      phoneNumber: shop?.phoneNumber
    })
  }

  const quotations = quotationsQuery.data ?? []

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Quotations</Title>
        <Button leftSection={<IconPlus size={18} />} onClick={() => setBuilderOpen(true)}>
          New quotation
        </Button>
      </Group>

      <SegmentedControl
        w="fit-content"
        value={statusFilter}
        onChange={setStatusFilter}
        data={['Open', 'Converted', 'Cancelled', 'All']}
      />

      <Card withBorder radius="md" padding={0}>
        {quotationsQuery.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : quotations.length === 0 ? (
          <Center py={48}>
            <Text c="dimmed">No quotations here yet.</Text>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={760}>
            <Table verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Number</Table.Th>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Customer</Table.Th>
                  <Table.Th ta="center">Items</Table.Th>
                  <Table.Th ta="right">Total</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th ta="right">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {quotations.map((q) => (
                  <Table.Tr key={q.id}>
                    <Table.Td>
                      <Text fw={600}>{q.quotationNumber}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{new Date(q.createdAt).toLocaleDateString()}</Text>
                      {q.validUntil && (
                        <Text size="xs" c="dimmed">
                          valid to {new Date(q.validUntil).toLocaleDateString()}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{q.customerName || '—'}</Text>
                    </Table.Td>
                    <Table.Td ta="center">{q.items.reduce((s, i) => s + i.quantity, 0)}</Table.Td>
                    <Table.Td ta="right">
                      <Text fw={600}>{formatMoney(q.totalAmount)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={STATUS_COLORS[q.status]}>
                        {q.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <Tooltip label="Print quotation">
                          <ActionIcon variant="subtle" color="gray" onClick={() => handlePrint(q)}>
                            <IconPrinter size={18} />
                          </ActionIcon>
                        </Tooltip>
                        {q.status === 'Open' && (
                          <>
                            <Tooltip label="Convert to sale">
                              <ActionIcon
                                variant="subtle"
                                color="teal"
                                onClick={() => setConvertTarget(q)}
                              >
                                <IconReceipt size={18} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Cancel">
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                loading={cancelMutation.isPending}
                                onClick={() => cancelMutation.mutate(q.id)}
                              >
                                <IconX size={18} />
                              </ActionIcon>
                            </Tooltip>
                          </>
                        )}
                        {q.status === 'Converted' && q.convertedSaleId && (
                          <Tooltip label="View invoice">
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              onClick={() => setInvoiceSaleId(q.convertedSaleId)}
                            >
                              <IconFileInvoice size={18} />
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

      <QuotationBuilderModal opened={builderOpen} onClose={() => setBuilderOpen(false)} />

      <ConvertModal
        quotation={convertTarget}
        onClose={() => setConvertTarget(null)}
        onConverted={(saleId) => {
          setConvertTarget(null)
          setInvoiceSaleId(saleId)
        }}
      />

      <InvoiceModal
        saleId={invoiceSaleId}
        onClose={() => setInvoiceSaleId(null)}
        onNewSale={() => setInvoiceSaleId(null)}
      />
    </Stack>
  )
}

interface ConvertModalProps {
  quotation: Quotation | null
  onClose: () => void
  onConverted: (saleId: number) => void
}

function ConvertModal({ quotation, onClose, onConverted }: ConvertModalProps): JSX.Element {
  const queryClient = useQueryClient()
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [customerId, setCustomerId] = useState<string | null>(null)
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: listCustomers })

  const customerOptions = useMemo(
    () =>
      (customersQuery.data ?? [])
        .filter((c) => c.isActive)
        .map((c) => ({ value: String(c.id), label: c.name })),
    [customersQuery.data]
  )

  // Seed the customer from the quotation whenever a new one is opened.
  const seededFor = quotation?.id ?? null
  const [seededId, setSeededId] = useState<number | null>(null)
  if (quotation && seededFor !== seededId) {
    setSeededId(seededFor)
    setCustomerId(quotation.customerId ? String(quotation.customerId) : null)
    setPaymentMethod('Cash')
  }

  const isCredit = paymentMethod === 'Credit'

  const mutation = useMutation({
    mutationFn: () =>
      convertQuotation(quotation!.id, {
        paymentMethod,
        customerId: customerId ? Number(customerId) : null
      }),
    onSuccess: async (updated) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['quotations'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
        queryClient.invalidateQueries({ queryKey: ['customers'] })
      ])
      notifications.show({ color: 'teal', message: 'Quotation converted to a sale.' })
      if (updated.convertedSaleId) onConverted(updated.convertedSaleId)
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not convert the quotation.'
      })
    }
  })

  return (
    <Modal
      opened={quotation !== null}
      onClose={onClose}
      title={quotation ? `Convert ${quotation.quotationNumber}` : 'Convert'}
      centered
      size="sm"
    >
      <Stack>
        <Text size="sm" c="dimmed">
          This deducts stock and creates a sale. Total{' '}
          <b>{quotation ? formatMoney(quotation.totalAmount) : ''}</b> (tax added at sale time).
        </Text>
        <Select
          label="Payment method"
          data={PAYMENT_METHODS}
          value={paymentMethod}
          onChange={(v) => setPaymentMethod(v ?? 'Cash')}
          allowDeselect={false}
        />
        <Select
          label={isCredit ? 'Customer — required for credit' : 'Customer (optional)'}
          placeholder="Walk-in customer"
          data={customerOptions}
          value={customerId}
          onChange={setCustomerId}
          searchable
          clearable
          nothingFoundMessage="No customers"
          error={isCredit && !customerId ? 'Select a customer for a credit sale' : undefined}
        />
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            leftSection={<IconReceipt size={18} />}
            loading={mutation.isPending}
            disabled={isCredit && !customerId}
            onClick={() => mutation.mutate()}
          >
            Convert to sale
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
