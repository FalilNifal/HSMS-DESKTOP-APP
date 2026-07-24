import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Center,
  Divider,
  Group,
  Loader,
  Modal,
  NumberInput,
  Stack,
  Table,
  Text,
  TextInput
} from '@mantine/core'
import { IconAlertTriangle, IconReceiptRefund, IconSearch } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { createReturn, getReturnable, type ReturnableSale } from '../../api/returns'
import { formatMoney } from '../../lib/format'

interface NewReturnModalProps {
  opened: boolean
  onClose: () => void
  /** When provided, the modal opens with this invoice pre-filled and auto-loaded. */
  initialInvoice?: string
}

export default function NewReturnModal({
  opened,
  onClose,
  initialInvoice
}: NewReturnModalProps): JSX.Element {
  const queryClient = useQueryClient()
  const [invoice, setInvoice] = useState('')
  const [sale, setSale] = useState<ReturnableSale | null>(null)
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [reason, setReason] = useState('')
  const fromBill = !!initialInvoice

  const reset = (): void => {
    setInvoice('')
    setSale(null)
    setQuantities({})
    setReason('')
  }

  const handleClose = (): void => {
    reset()
    onClose()
  }

  const loadMutation = useMutation({
    mutationFn: (inv: string) => getReturnable(inv.trim()),
    onSuccess: (data) => {
      setSale(data)
      const initial: Record<number, number> = {}
      data.items.forEach((item) => {
        initial[item.productId] = 0
      })
      setQuantities(initial)
    },
    onError: (error) => {
      setSale(null)
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not find that invoice.'
      })
    }
  })

  // When opened from an existing bill, pre-fill the invoice and load it automatically.
  useEffect(() => {
    if (opened && initialInvoice) {
      setInvoice(initialInvoice)
      loadMutation.mutate(initialInvoice)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, initialInvoice])

  const createMutation = useMutation({
    mutationFn: () => {
      const items = (sale?.items ?? [])
        .map((item) => ({ productId: item.productId, quantity: quantities[item.productId] ?? 0 }))
        .filter((item) => item.quantity > 0)
      return createReturn({ invoiceNumber: sale!.invoiceNumber, reason: reason.trim(), items })
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['returns'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] })
      ])
      notifications.show({
        color: 'teal',
        title: `Return ${data.returnNumber} processed`,
        message: `Refund ${formatMoney(data.totalRefund)}. Items returned to stock.`
      })
      handleClose()
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not process the return.'
      })
    }
  })

  const refundTotal = (sale?.items ?? []).reduce(
    (sum, item) => sum + (quantities[item.productId] ?? 0) * item.unitPrice,
    0
  )
  const hasSelection = (sale?.items ?? []).some((item) => (quantities[item.productId] ?? 0) > 0)

  return (
    <Modal opened={opened} onClose={handleClose} title="New return / refund" size="lg" centered>
      <Stack>
        <Group align="flex-end" gap="xs" wrap="nowrap">
          <TextInput
            label="Invoice number"
            placeholder="e.g. INV-20260718-0004"
            leftSection={<IconSearch size={16} />}
            value={invoice}
            onChange={(e) => setInvoice(e.currentTarget.value)}
            readOnly={fromBill}
            style={{ flex: 1 }}
            onKeyDown={(e) => {
              if (!fromBill && e.key === 'Enter' && invoice.trim()) loadMutation.mutate(invoice)
            }}
          />
          {!fromBill && (
            <Button
              onClick={() => loadMutation.mutate(invoice)}
              disabled={invoice.trim().length === 0}
              loading={loadMutation.isPending}
            >
              Load sale
            </Button>
          )}
        </Group>

        {fromBill && loadMutation.isPending && (
          <Center py="md">
            <Loader size="sm" />
          </Center>
        )}

        {sale && (
          <>
            <Text size="sm" c="dimmed">
              Sold by {sale.soldByUserName || '—'} on {new Date(sale.createdAt).toLocaleString()}
            </Text>

            {sale.items.every((item) => item.returnableQuantity <= 0) ? (
              <Alert color="orange" icon={<IconAlertTriangle size={18} />}>
                Every item on this invoice has already been fully returned.
              </Alert>
            ) : (
              <Table.ScrollContainer minWidth={520}>
                <Table verticalSpacing="xs">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Product</Table.Th>
                      <Table.Th ta="right">Price</Table.Th>
                      <Table.Th ta="center">Returnable</Table.Th>
                      <Table.Th ta="center">Return qty</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {sale.items.map((item) => (
                      <Table.Tr key={item.productId}>
                        <Table.Td>
                          <Text size="sm">{item.productName}</Text>
                          <Text size="xs" c="dimmed">
                            {item.sku}
                          </Text>
                        </Table.Td>
                        <Table.Td ta="right">{formatMoney(item.unitPrice)}</Table.Td>
                        <Table.Td ta="center">
                          {item.returnableQuantity} / {item.soldQuantity}
                        </Table.Td>
                        <Table.Td ta="center">
                          <NumberInput
                            size="xs"
                            w={80}
                            min={0}
                            max={item.returnableQuantity}
                            disabled={item.returnableQuantity <= 0}
                            value={quantities[item.productId] ?? 0}
                            onChange={(v) =>
                              setQuantities((prev) => ({ ...prev, [item.productId]: Number(v) || 0 }))
                            }
                          />
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}

            <TextInput
              label="Reason"
              placeholder="e.g. Damaged, wrong item, customer changed mind"
              value={reason}
              onChange={(e) => setReason(e.currentTarget.value)}
            />

            <Divider />
            <Group justify="space-between">
              <Text fw={600}>Refund total</Text>
              <Text fw={800} size="lg" c="blue">
                {formatMoney(refundTotal)}
              </Text>
            </Group>

            <Group justify="flex-end">
              <Button variant="default" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                color="blue"
                leftSection={<IconReceiptRefund size={18} />}
                disabled={!hasSelection}
                loading={createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                Process return
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  )
}
