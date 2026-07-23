import { useMemo, useState } from 'react'
import {
  ActionIcon,
  Button,
  Card,
  Center,
  Divider,
  Grid,
  Group,
  Loader,
  Modal,
  NumberInput,
  ScrollArea,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  UnstyledButton
} from '@mantine/core'
import { IconSearch, IconShoppingCartOff, IconX } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { listProducts, type Product } from '../../api/products'
import { listCustomers } from '../../api/customers'
import { createQuotation } from '../../api/quotations'
import { formatMoney } from '../../lib/format'

interface QuoteLine {
  productId: number
  name: string
  sku: string
  baseMinPrice: number
  unit: string
  secondaryUnit: string | null
  secondaryUnitFactor: number
  secondaryUnitPrice: number
  quantity: number
  unitPrice: number
  unitFactor: number
  unitLabel: string
}

function lineMinPrice(line: QuoteLine): number {
  return line.baseMinPrice * (line.unitFactor || 1)
}

function lineIsInvalid(line: QuoteLine): boolean {
  return line.quantity < 1 || Number.isNaN(line.unitPrice) || line.unitPrice < lineMinPrice(line)
}

interface QuotationBuilderModalProps {
  opened: boolean
  onClose: () => void
}

export default function QuotationBuilderModal({
  opened,
  onClose
}: QuotationBuilderModalProps): JSX.Element {
  const queryClient = useQueryClient()
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: listCustomers })

  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<QuoteLine[]>([])
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')

  const resetAndClose = (): void => {
    setCart([])
    setCustomerId(null)
    setCustomerName('')
    setValidUntil('')
    setNotes('')
    setSearch('')
    onClose()
  }

  const available = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (productsQuery.data ?? [])
      .filter((p) => p.isActive)
      .filter((p) =>
        term.length === 0
          ? true
          : p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)
      )
      .slice(0, 60)
  }, [productsQuery.data, search])

  const addToCart = (product: Product): void => {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id)
      if (existing) {
        return prev.map((l) => (l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l))
      }
      const unit = product.unit || 'pcs'
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
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

  const patchLine = (productId: number, patch: Partial<QuoteLine>): void => {
    setCart((prev) => prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)))
  }

  const removeLine = (productId: number): void => {
    setCart((prev) => prev.filter((l) => l.productId !== productId))
  }

  const changeUnit = (line: QuoteLine, useBulk: boolean): void => {
    if (useBulk) {
      patchLine(line.productId, {
        unitFactor: line.secondaryUnitFactor,
        unitLabel: line.secondaryUnit ?? line.unit,
        unitPrice: line.secondaryUnitPrice || line.baseMinPrice * line.secondaryUnitFactor
      })
    } else {
      patchLine(line.productId, {
        unitFactor: 1,
        unitLabel: line.unit,
        unitPrice: line.baseMinPrice
      })
    }
  }

  const total = useMemo(
    () =>
      cart.reduce((sum, l) => sum + l.quantity * (Number.isNaN(l.unitPrice) ? 0 : l.unitPrice), 0),
    [cart]
  )

  const customerOptions = useMemo(
    () =>
      (customersQuery.data ?? [])
        .filter((c) => c.isActive)
        .map((c) => ({ value: String(c.id), label: c.name })),
    [customersQuery.data]
  )

  const mutation = useMutation({
    mutationFn: () =>
      createQuotation({
        customerId: customerId ? Number(customerId) : null,
        customerName: customerId ? null : customerName.trim() || null,
        notes: notes.trim() || null,
        validUntil: validUntil || null,
        items: cart.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          unitFactor: l.unitFactor || 1,
          unitLabel: l.unitLabel
        }))
      }),
    onSuccess: async (quotation) => {
      await queryClient.invalidateQueries({ queryKey: ['quotations'] })
      notifications.show({ color: 'teal', message: `Quotation ${quotation.quotationNumber} saved.` })
      resetAndClose()
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not save the quotation.'
      })
    }
  })

  const cartInvalid = cart.length === 0 || cart.some(lineIsInvalid)

  return (
    <Modal opened={opened} onClose={resetAndClose} title="New quotation" size="xl" centered>
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, md: 6 }}>
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
          ) : (
            <ScrollArea.Autosize mah={420}>
              <Stack gap={4}>
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
                      <Text fw={500}>{formatMoney(product.minimumSellingPrice)}</Text>
                    </Group>
                  </UnstyledButton>
                ))}
              </Stack>
            </ScrollArea.Autosize>
          )}
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder radius="md" padding="sm">
            {cart.length === 0 ? (
              <Center py={40}>
                <Stack align="center" gap="xs">
                  <IconShoppingCartOff size={32} opacity={0.5} />
                  <Text c="dimmed" size="sm">
                    Add products to quote.
                  </Text>
                </Stack>
              </Center>
            ) : (
              <ScrollArea.Autosize mah={300}>
                <Stack gap="sm">
                  {cart.map((line) => {
                    const factor = line.unitFactor || 1
                    const minPrice = lineMinPrice(line)
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
                            w={70}
                            min={1}
                            allowDecimal={false}
                            value={line.quantity}
                            onChange={(v) => patchLine(line.productId, { quantity: Number(v) })}
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
                            {formatMoney(
                              line.quantity * (Number.isNaN(line.unitPrice) ? 0 : line.unitPrice)
                            )}
                          </Text>
                        </Group>
                      </div>
                    )
                  })}
                </Stack>
              </ScrollArea.Autosize>
            )}

            <Divider my="sm" />

            <Group justify="space-between" mb="sm">
              <Text fw={600}>Total</Text>
              <Text fw={800} size="lg" c="blue">
                {formatMoney(total)}
              </Text>
            </Group>

            <Select
              label="Customer (optional)"
              placeholder="Saved customer"
              data={customerOptions}
              value={customerId}
              onChange={(v) => {
                setCustomerId(v)
                if (v) setCustomerName('')
              }}
              searchable
              clearable
              nothingFoundMessage="No customers"
              mb="xs"
            />
            {!customerId && (
              <TextInput
                label="Or type a name"
                placeholder="Walk-in customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.currentTarget.value)}
                mb="xs"
              />
            )}
            <TextInput
              label="Valid until"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.currentTarget.value)}
              mb="xs"
            />
            <Textarea
              label="Notes"
              placeholder="Optional notes shown on the printed quote"
              autosize
              minRows={2}
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
            />

            <Button
              fullWidth
              mt="md"
              disabled={cartInvalid}
              loading={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              Save quotation
            </Button>
          </Card>
        </Grid.Col>
      </Grid>
    </Modal>
  )
}
