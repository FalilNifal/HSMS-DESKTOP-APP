import { Box, Button, Center, Divider, Group, Loader, Modal, Stack, Text } from '@mantine/core'
import { IconPrinter, IconShoppingCartPlus } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { getInvoice } from '../../api/sales'
import { formatMoney } from '../../lib/format'
import { printInvoice } from '../../lib/printReceipt'

interface InvoiceModalProps {
  saleId: number | null
  onClose: () => void
  onNewSale: () => void
}

export default function InvoiceModal({ saleId, onClose, onNewSale }: InvoiceModalProps): JSX.Element {
  const invoiceQuery = useQuery({
    queryKey: ['invoice', saleId],
    queryFn: () => getInvoice(saleId as number),
    enabled: saleId !== null
  })

  const invoice = invoiceQuery.data

  return (
    <Modal
      opened={saleId !== null}
      onClose={onClose}
      title="Sale complete"
      centered
      size="sm"
    >
      {invoiceQuery.isLoading || !invoice ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : (
        <Stack>
          <Box
            id="print-receipt"
            p="sm"
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
          >
            <Stack gap={2} align="center">
              <Text fw={700} size="lg">
                {invoice.shopName}
              </Text>
              {invoice.address && (
                <Text size="xs" ta="center">
                  {invoice.address}
                </Text>
              )}
              {invoice.phoneNumber && <Text size="xs">Tel: {invoice.phoneNumber}</Text>}
            </Stack>

            <Divider my="xs" variant="dashed" />

            <Stack gap={2}>
              <ReceiptRow label="Invoice" value={invoice.invoiceNumber} />
              <ReceiptRow label="Date" value={new Date(invoice.createdAt).toLocaleString()} />
              <ReceiptRow label="Cashier" value={invoice.cashierName} />
              <ReceiptRow label="Payment" value={invoice.paymentMethod} />
            </Stack>

            <Divider my="xs" variant="dashed" />

            <Stack gap={6}>
              {invoice.items.map((item, index) => (
                <div key={index}>
                  <Text size="sm">{item.productName}</Text>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                      {item.quantity} × {formatMoney(item.actualSellingPrice)}
                    </Text>
                    <Text size="sm">{formatMoney(item.lineTotal)}</Text>
                  </Group>
                </div>
              ))}
            </Stack>

            <Divider my="xs" variant="dashed" />

            {invoice.taxAmount > 0 && (
              <>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Subtotal
                  </Text>
                  <Text size="sm">{formatMoney(invoice.subTotal)}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    {invoice.taxLabel}
                  </Text>
                  <Text size="sm">{formatMoney(invoice.taxAmount)}</Text>
                </Group>
              </>
            )}

            <Group justify="space-between">
              <Text fw={700}>TOTAL</Text>
              <Text fw={700} size="lg">
                {formatMoney(invoice.totalAmount)}
              </Text>
            </Group>

            {invoice.invoiceFooterMessage && (
              <>
                <Divider my="xs" variant="dashed" />
                <Text size="xs" ta="center" c="dimmed">
                  {invoice.invoiceFooterMessage}
                </Text>
              </>
            )}
          </Box>

          <Group justify="space-between" className="no-print">
            <Button
              variant="light"
              leftSection={<IconPrinter size={18} />}
              onClick={() => printInvoice(invoice)}
            >
              Print
            </Button>
            <Button leftSection={<IconShoppingCartPlus size={18} />} onClick={onNewSale}>
              New sale
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  )
}

function ReceiptRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <Group justify="space-between" gap="xs" wrap="nowrap">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="xs" ta="right">
        {value}
      </Text>
    </Group>
  )
}
