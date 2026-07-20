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
  IconAdjustmentsAlt,
  IconAlertTriangle,
  IconEdit,
  IconPackageOff,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUpload,
  IconRestore
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import { listCategories, listSuppliers } from '../api/catalog'
import { deactivateProduct, listProducts, reactivateProduct, type Product } from '../api/products'
import { formatInteger, formatMoney } from '../lib/format'
import ProductFormModal from '../components/products/ProductFormModal'
import StockAdjustModal from '../components/products/StockAdjustModal'
import CategoryQuickModal from '../components/products/CategoryQuickModal'
import ImportProductsModal from '../components/products/ImportProductsModal'

function InventoryStat({
  label,
  value,
  accent = false
}: {
  label: string
  value: string
  accent?: boolean
}): JSX.Element {
  return (
    <Card
      withBorder
      radius="md"
      padding="md"
      style={accent ? { borderTop: '3px solid var(--mantine-color-blue-6)' } : undefined}
    >
      <Text size="xs" c="dimmed" fw={600} tt="uppercase" style={{ letterSpacing: '0.03em' }}>
        {label}
      </Text>
      <Text fz={24} fw={700} mt={4} c={accent ? 'blue' : undefined}>
        {value}
      </Text>
    </Card>
  )
}

export default function ProductsPage(): JSX.Element {
  const queryClient = useQueryClient()

  const productsQuery = useQuery({ queryKey: ['products'], queryFn: listProducts })
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories })
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: listSuppliers })

  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [formState, setFormState] = useState<{ opened: boolean; product: Product | null }>({
    opened: false,
    product: null
  })
  const [stockState, setStockState] = useState<{ opened: boolean; product: Product | null }>({
    opened: false,
    product: null
  })
  const [categoryModalOpened, setCategoryModalOpened] = useState(false)
  const [importOpened, setImportOpened] = useState(false)
  const [deactivateTarget, setDeactivateTarget] = useState<Product | null>(null)

  const deactivateMutation = useMutation({
    mutationFn: (product: Product) => deactivateProduct(product.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      notifications.show({ color: 'teal', message: 'Product deactivated.' })
      setDeactivateTarget(null)
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not deactivate the product.'
      })
    }
  })

  const reactivateMutation = useMutation({
    mutationFn: (product: Product) => reactivateProduct(product.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      notifications.show({ color: 'teal', message: 'Product reactivated.' })
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not reactivate the product.'
      })
    }
  })

  const inventory = useMemo(() => {
    const active = (productsQuery.data ?? []).filter((p) => p.isActive)
    return {
      count: active.length,
      units: active.reduce((sum, p) => sum + p.stockQuantity, 0),
      cost: active.reduce((sum, p) => sum + p.stockQuantity * (p.purchasePrice ?? 0), 0),
      retail: active.reduce((sum, p) => sum + p.stockQuantity * p.minimumSellingPrice, 0)
    }
  }, [productsQuery.data])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (productsQuery.data ?? [])
      .filter((p) => (showInactive ? true : p.isActive))
      .filter((p) =>
        term.length === 0
          ? true
          : p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)
      )
  }, [productsQuery.data, search, showInactive])

  const openCreate = (): void => setFormState({ opened: true, product: null })
  const openEdit = (product: Product): void => setFormState({ opened: true, product })

  return (
    <Stack>
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Products &amp; Inventory</Title>
          <Text c="dimmed">{productsQuery.data?.length ?? 0} products in catalog</Text>
        </div>
        <Group gap="sm">
          <Button
            variant="default"
            leftSection={<IconUpload size={18} />}
            onClick={() => setImportOpened(true)}
          >
            Import CSV
          </Button>
          <Button leftSection={<IconPlus size={18} />} onClick={openCreate}>
            Add product
          </Button>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="sm">
        <InventoryStat label="Active products" value={formatInteger(inventory.count)} />
        <InventoryStat label="Units in stock" value={formatInteger(inventory.units)} />
        <InventoryStat label="Stock value (cost)" value={formatMoney(inventory.cost)} accent />
        <InventoryStat label="Potential value" value={formatMoney(inventory.retail)} />
      </SimpleGrid>

      <Group justify="space-between">
        <TextInput
          placeholder="Search by name or SKU…"
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

      {productsQuery.isError && (
        <Alert color="red" icon={<IconAlertTriangle size={18} />}>
          {productsQuery.error instanceof ApiError
            ? productsQuery.error.message
            : 'Failed to load products.'}
        </Alert>
      )}

      <Card withBorder padding={0} radius="md">
        {productsQuery.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : filtered.length === 0 ? (
          <Center py={48}>
            <Stack align="center" gap="xs">
              <IconPackageOff size={40} opacity={0.5} />
              <Text c="dimmed">
                {productsQuery.data?.length ? 'No products match your search.' : 'No products yet.'}
              </Text>
              {!productsQuery.data?.length && (
                <Button variant="light" leftSection={<IconPlus size={16} />} onClick={openCreate}>
                  Add your first product
                </Button>
              )}
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={880}>
            <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>SKU</Table.Th>
                  <Table.Th>Category</Table.Th>
                  <Table.Th>Supplier</Table.Th>
                  <Table.Th ta="right">Purchase</Table.Th>
                  <Table.Th ta="right">Min. price</Table.Th>
                  <Table.Th ta="center">Stock</Table.Th>
                  <Table.Th ta="right">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.map((product) => {
                  const isLow = product.isActive && product.stockQuantity <= product.lowStockLevel
                  return (
                    <Table.Tr key={product.id} opacity={product.isActive ? 1 : 0.55}>
                      <Table.Td>
                        <Group gap={6}>
                          <Text fw={500}>{product.name}</Text>
                          {!product.isActive && (
                            <Badge size="xs" color="gray" variant="light">
                              Inactive
                            </Badge>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {product.sku}
                        </Text>
                      </Table.Td>
                      <Table.Td>{product.categoryName}</Table.Td>
                      <Table.Td>{product.supplierName ?? '—'}</Table.Td>
                      <Table.Td ta="right">{formatMoney(product.purchasePrice)}</Table.Td>
                      <Table.Td ta="right">{formatMoney(product.minimumSellingPrice)}</Table.Td>
                      <Table.Td ta="center">
                        <Badge color={isLow ? 'red' : 'gray'} variant={isLow ? 'filled' : 'light'}>
                          {product.stockQuantity}
                          {isLow ? ' • Low' : ''}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4} justify="flex-end" wrap="nowrap">
                          <Tooltip label="Edit">
                            <ActionIcon variant="subtle" color="gray" onClick={() => openEdit(product)}>
                              <IconEdit size={18} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Adjust stock">
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              onClick={() => setStockState({ opened: true, product })}
                            >
                              <IconAdjustmentsAlt size={18} />
                            </ActionIcon>
                          </Tooltip>
                          {product.isActive ? (
                            <Tooltip label="Deactivate">
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                onClick={() => setDeactivateTarget(product)}
                              >
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
                                  reactivateMutation.variables?.id === product.id
                                }
                                onClick={() => reactivateMutation.mutate(product)}
                              >
                                <IconRestore size={18} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  )
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>

      <ProductFormModal
        opened={formState.opened}
        product={formState.product}
        categories={categoriesQuery.data ?? []}
        suppliers={suppliersQuery.data ?? []}
        onRequestAddCategory={() => setCategoryModalOpened(true)}
        onClose={() => setFormState({ opened: false, product: null })}
      />

      <StockAdjustModal
        opened={stockState.opened}
        product={stockState.product}
        onClose={() => setStockState({ opened: false, product: null })}
      />

      <CategoryQuickModal
        opened={categoryModalOpened}
        onClose={() => setCategoryModalOpened(false)}
        onCreated={() => setCategoryModalOpened(false)}
      />

      <ImportProductsModal opened={importOpened} onClose={() => setImportOpened(false)} />

      <Modal
        opened={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        title="Deactivate product"
        centered
      >
        <Stack>
          <Text>
            Deactivate <b>{deactivateTarget?.name}</b>? It will be hidden from billing but its sales
            history is preserved. You can still see it here with “Show inactive”.
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
