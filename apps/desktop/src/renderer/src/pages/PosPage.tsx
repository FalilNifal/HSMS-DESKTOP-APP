import { useMemo, useState } from 'react'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Grid,
  Group,
  Loader,
  Modal,
  NumberInput,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton
} from '@mantine/core'
import {
  IconAlertTriangle,
  IconClipboardList,
  IconClipboardPlus,
  IconSearch,
  IconShoppingCart,
  IconShoppingCartOff,
  IconX
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import { listProducts, type Product } from '../api/products'
import { createSale } from '../api/sales'
import { listCustomers } from '../api/customers'
import { useHeldSalesStore, type HeldSale } from '../store/heldSalesStore'
import { useSettingsStore } from '../store/settingsStore'
import { formatMoney } from '../lib/format'
import InvoiceModal from '../components/pos/InvoiceModal'

const PAYMENT_METHODS = ['Cash', 'Card', 'Mobile', 'Credit', 'Other']

export interface CartLine {
  productId: number
  name: string
  sku: string
  /** Product stock, in base units. */
  baseStock: number
  /** Minimum selling price per base unit. */
  baseMinPrice: number
  /** Base unit label, e.g. "pcs". */
  unit: string
  secondaryUnit: string | null
  /** Base units per bulk unit (0 = product has no bulk unit). */
  secondaryUnitFactor: number
  secondaryUnitPrice: number
  quantity: number
  /** Price per selected unit. */
  unitPrice: number
  /** Base units per selected unit (1 = base unit). */
  unitFactor: number
  /** Selected unit label. */
  unitLabel: string
}

function lineMaxQty(line: CartLine): number {
  return Math.floor(line.baseStock / (line.unitFactor || 1))
}

function lineMinPrice(line: CartLine): number {
  return line.baseMinPrice * (line.unitFactor || 1)
}

function lineIsInvalid(line: CartLine): boolean {
  return (
    line.quantity < 1 ||
    line.quantity > lineMaxQty(line) ||
    Number.isNaN(line.unitPrice) ||
    line.unitPrice < lineMinPrice(line)
  )
}

export default function PosPage(): JSX.Element {
  const queryClient = useQueryClient()
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: listCustomers })

  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash')
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [invoiceSaleId, setInvoiceSaleId] = useState<number | null>(null)
  const [heldOpen, setHeldOpen] = useState(false)
  const held = useHeldSalesStore((s) => s.held)
  const holdSale = useHeldSalesStore((s) => s.hold)
  const removeHeld = useHeldSalesStore((s) => s.remove)
  const taxRatePercent = useSettingsStore((s) => s.taxRatePercent)
  const taxLabel = useSettingsStore((s) => s.taxLabel)

  const available = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (productsQuery.data ?? [])
      .filter((p) => p.isActive && p.stockQuantity > 0)
      .filter((p) =>
        term.length === 0
          ? true
          : p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)
      )
  }, [productsQuery.data, search])

  const addToCart = (product: Product): void => {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id)
      if (existing) {
        if (existing.quantity >= lineMaxQty(existing)) return prev
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l
        )
      }
      const unit = product.unit || 'pcs'
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          baseStock: product.stockQuantity,
          baseMinPrice: product.minimumSellingPrice,
          unit,
          secondaryUnit: product.secondaryUnit,
          secondaryUnitFactor: product.secondaryUnitFactor || 0,
          secondaryUnitPrice: product.secondaryUnitPrice || 0,
          quantity: 1,
          unitPrice: product.minimumSellingPrice,
          unitFactor: 1,
          unitLabel: unit
        }
      ]
    })
  }

  const patchLine = (productId: number, patch: Partial<CartLine>): void => {
    setCart((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)))
  }

  const changeUnit = (line: CartLine, useBulk: boolean): void => {
    if (useBulk) {
      patchLine(line.productId, {
        unitFactor: line.secondaryUnitFactor,
        unitLabel: line.secondaryUnit ?? line.unit,
        unitPrice: line.secondaryUnitPrice || line.baseMinPrice * line.secondaryUnitFactor,
        quantity: 1
      })
    } else {
      patchLine(line.productId, {
        unitFactor: 1,
        unitLabel: line.unit,
        unitPrice: line.baseMinPrice,
        quantity: 1
      })
    }
  }

  const removeLine = (productId: number): void => {
    setCart((prev) => prev.filter((l) => l.productId !== productId))
  }

  const total = useMemo(
    () => cart.reduce((sum, l) => sum + l.quantity * (Number.isNaN(l.unitPrice) ? 0 : l.unitPrice), 0),
    [cart]
  )

  const taxAmount = taxRatePercent > 0 ? Math.round(total * taxRatePercent) / 100 : 0
  const grandTotal = total + taxAmount

  const customerOptions = useMemo(
    () =>
      (customersQuery.data ?? [])
        .filter((c) => c.isActive)
        .map((c) => ({ value: String(c.id), label: c.name })),
    [customersQuery.data]
  )

  const isCredit = paymentMethod === 'Credit'
  const cartInvalid = cart.length === 0 || cart.some(lineIsInvalid) || (isCredit && !customerId)

  const saleMutation = useMutation({
    mutationFn: () =>
      createSale({
        paymentMethod,
        customerId: customerId ? Number(customerId) : null,
        items: cart.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          actualSellingPrice: l.unitPrice,
          unitFactor: l.unitFactor || 1,
          unitLabel: l.unitLabel
        }))
      }),
    onSuccess: async (sale) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
        queryClient.invalidateQueries({ queryKey: ['customers'] })
      ])
      notifications.show({ color: 'teal', message: `Sale ${sale.invoiceNumber} completed.` })
      setCart([])
      setCustomerId(null)
      setInvoiceSaleId(sale.id)
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not complete the sale.'
      })
    }
  })

  const handleHold = (): void => {
    if (cart.length === 0) return
    const customerName = customerOptions.find((o) => o.value === customerId)?.label
    const label = customerName ?? `${cart[0].name}${cart.length > 1 ? ` +${cart.length - 1}` : ''}`
    holdSale({ label, cart, customerId, paymentMethod })
    setCart([])
    setCustomerId(null)
    setPaymentMethod('Cash')
    notifications.show({ color: 'blue', message: 'Sale held — resume it from "Held".' })
  }

  const resumeHeld = (sale: HeldSale): void => {
    setCart(sale.cart)
    setCustomerId(sale.customerId)
    setPaymentMethod(sale.paymentMethod)
    removeHeld(sale.id)
    setHeldOpen(false)
  }

  return (
    <Stack h="100%">
      <Group justify="space-between">
        <Title order={2}>POS Billing</Title>
        <Button
          variant="light"
          leftSection={<IconClipboardList size={18} />}
          onClick={() => setHeldOpen(true)}
          disabled={held.length === 0}
        >
          Held ({held.length})
        </Button>
      </Group>

      <Grid gutter="md">
        {/* Product picker */}
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Card withBorder radius="md" padding="sm" className="hsms-animate-in">
            <TextInput
              placeholder="Search products by name or SKU…"
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              mb="sm"
            />
            {productsQuery.isLoading ? (
              <Center py="xl">
                <Loader />
              </Center>
            ) : productsQuery.isError ? (
              <Alert color="red" icon={<IconAlertTriangle size={18} />}>
                Failed to load products.
              </Alert>
            ) : available.length === 0 ? (
              <Center py="xl">
                <Text c="dimmed">No products in stock match your search.</Text>
              </Center>
            ) : (
              <ScrollArea.Autosize mah={560}>
                <Stack gap={6}>
                  {available.map((product) => (
                    <UnstyledButton
                      key={product.id}
                      onClick={() => addToCart(product)}
                      p="xs"
                      style={{ borderRadius: 8 }}
                      className="pos-product-row"
                    >
                      <Group justify="space-between" wrap="nowrap">
                        <div style={{ minWidth: 0 }}>
                          <Text fw={500} truncate>
                            {product.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {product.sku} · {product.categoryName}
                          </Text>
                        </div>
                        <Group gap="xs" wrap="nowrap">
                          <Text fw={500}>{formatMoney(product.minimumSellingPrice)}</Text>
                          <Badge
                            variant="light"
                            color={product.stockQuantity <= product.lowStockLevel ? 'orange' : 'gray'}
                          >
                            {product.stockQuantity} in stock
                          </Badge>
                        </Group>
                      </Group>
                    </UnstyledButton>
                  ))}
                </Stack>
              </ScrollArea.Autosize>
            )}
          </Card>
        </Grid.Col>

        {/* Cart */}
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Card withBorder radius="md" padding="sm" className="hsms-animate-in">
            <Group gap="xs" mb="sm">
              <IconShoppingCart size={20} />
              <Text fw={600}>Current sale</Text>
              {cart.length > 0 && (
                <Badge variant="light">{cart.length} item{cart.length > 1 ? 's' : ''}</Badge>
              )}
            </Group>

            {cart.length === 0 ? (
              <Center py={40}>
                <Stack align="center" gap="xs">
                  <IconShoppingCartOff size={36} opacity={0.5} />
                  <Text c="dimmed" size="sm">
                    Click a product to add it to the sale.
                  </Text>
                </Stack>
              </Center>
            ) : (
              <>
                <ScrollArea.Autosize mah={380}>
                  <Stack gap="sm">
                    {cart.map((line) => {
                      const factor = line.unitFactor || 1
                      const maxQty = lineMaxQty(line)
                      const minPrice = lineMinPrice(line)
                      const overStock = line.quantity > maxQty
                      const belowMin = line.unitPrice < minPrice
                      const hasBulk = line.secondaryUnitFactor >= 2 && !!line.secondaryUnit
                      return (
                        <div key={line.productId}>
                          <Group justify="space-between" wrap="nowrap" mb={4}>
                            <Text size="sm" fw={500} truncate>
                              {line.name}
                            </Text>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              onClick={() => removeLine(line.productId)}
                              aria-label="Remove"
                            >
                              <IconX size={16} />
                            </ActionIcon>
                          </Group>
                          {hasBulk && (
                            <Select
                              size="xs"
                              mb={4}
                              data={[
                                { value: 'base', label: `By ${line.unit}` },
                                {
                                  value: 'bulk',
                                  label: `By ${line.secondaryUnit} (${line.secondaryUnitFactor} ${line.unit})`
                                }
                              ]}
                              value={factor === 1 ? 'base' : 'bulk'}
                              onChange={(v) => changeUnit(line, v === 'bulk')}
                              allowDeselect={false}
                            />
                          )}
                          <Group gap="xs" wrap="nowrap" align="flex-start">
                            <NumberInput
                              size="xs"
                              w={72}
                              min={1}
                              max={maxQty}
                              allowDecimal={false}
                              value={line.quantity}
                              onChange={(v) => patchLine(line.productId, { quantity: Number(v) })}
                              error={overStock ? `Max ${maxQty}` : undefined}
                            />
                            <Text size="sm" mt={6}>
                              ×
                            </Text>
                            <NumberInput
                              size="xs"
                              w={110}
                              min={0}
                              decimalScale={2}
                              value={line.unitPrice}
                              onChange={(v) => patchLine(line.productId, { unitPrice: Number(v) })}
                              error={belowMin ? `Min ${formatMoney(minPrice)}` : undefined}
                            />
                            <Text size="sm" fw={600} ml="auto" mt={6}>
                              {formatMoney(line.quantity * (Number.isNaN(line.unitPrice) ? 0 : line.unitPrice))}
                            </Text>
                          </Group>
                          {factor > 1 && (
                            <Text size="xs" c="dimmed" mt={2}>
                              = {line.quantity * factor} {line.unit} · {line.baseStock} in stock
                            </Text>
                          )}
                        </div>
                      )
                    })}
                  </Stack>
                </ScrollArea.Autosize>

                {taxRatePercent > 0 && (
                  <>
                    <Group justify="space-between" mt="md">
                      <Text size="sm" c="dimmed">
                        Subtotal
                      </Text>
                      <Text size="sm">{formatMoney(total)}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        {taxLabel} ({taxRatePercent}%)
                      </Text>
                      <Text size="sm">{formatMoney(taxAmount)}</Text>
                    </Group>
                  </>
                )}

                <Group
                  justify="space-between"
                  align="center"
                  mt={taxRatePercent > 0 ? 'xs' : 'md'}
                  p="sm"
                  style={{
                    borderRadius: 'var(--mantine-radius-md)',
                    backgroundColor: 'var(--mantine-color-blue-light)'
                  }}
                >
                  <Text fw={600}>Total</Text>
                  <Text fw={800} size="xl" c="blue">
                    {formatMoney(grandTotal)}
                  </Text>
                </Group>

                <Select
                  label="Payment method"
                  data={PAYMENT_METHODS}
                  value={paymentMethod}
                  onChange={(v) => setPaymentMethod(v ?? 'Cash')}
                  allowDeselect={false}
                  mt="sm"
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
                  mt="sm"
                  error={isCredit && !customerId ? 'Select a customer for a credit sale' : undefined}
                />

                <Button
                  fullWidth
                  variant="default"
                  mt="md"
                  leftSection={<IconClipboardPlus size={18} />}
                  disabled={cart.length === 0}
                  onClick={handleHold}
                >
                  Hold sale
                </Button>

                <Button
                  fullWidth
                  size="md"
                  mt="sm"
                  disabled={cartInvalid}
                  loading={saleMutation.isPending}
                  onClick={() => saleMutation.mutate()}
                >
                  Complete sale · {formatMoney(grandTotal)}
                </Button>
              </>
            )}
          </Card>
        </Grid.Col>
      </Grid>

      <Modal opened={heldOpen} onClose={() => setHeldOpen(false)} title="Held sales" centered>
        <Stack>
          {held.length === 0 ? (
            <Text c="dimmed" ta="center" py="md">
              No held sales.
            </Text>
          ) : (
            held.map((sale) => {
              const heldTotal = sale.cart.reduce(
                (s, l) => s + l.quantity * (Number.isNaN(l.unitPrice) ? 0 : l.unitPrice),
                0
              )
              return (
                <Card key={sale.id} withBorder radius="md" padding="sm">
                  <Group justify="space-between" wrap="nowrap">
                    <div style={{ minWidth: 0 }}>
                      <Text fw={500} truncate>
                        {sale.label}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {sale.cart.length} item{sale.cart.length > 1 ? 's' : ''} ·{' '}
                        {formatMoney(heldTotal)} · {new Date(sale.createdAt).toLocaleTimeString()}
                      </Text>
                    </div>
                    <Group gap="xs" wrap="nowrap">
                      <Button size="xs" onClick={() => resumeHeld(sale)}>
                        Resume
                      </Button>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => removeHeld(sale.id)}
                        aria-label="Delete held sale"
                      >
                        <IconX size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Card>
              )
            })
          )}
        </Stack>
      </Modal>

      <InvoiceModal
        saleId={invoiceSaleId}
        onClose={() => setInvoiceSaleId(null)}
        onNewSale={() => setInvoiceSaleId(null)}
      />
    </Stack>
  )
}
