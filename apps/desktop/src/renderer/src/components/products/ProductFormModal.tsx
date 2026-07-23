import { useEffect, useMemo } from 'react'
import {
  Alert,
  Button,
  Divider,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  TextInput,
  Tooltip,
  ActionIcon
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { IconPlus, IconInfoCircle } from '@tabler/icons-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import type { Category, Supplier } from '../../api/catalog'
import {
  createProduct,
  updateProduct,
  type Product,
  type ProductWriteRequest
} from '../../api/products'

interface ProductFormModalProps {
  opened: boolean
  onClose: () => void
  product: Product | null
  categories: Category[]
  suppliers: Supplier[]
  onRequestAddCategory: () => void
}

interface FormValues {
  name: string
  sku: string
  categoryId: string
  supplierId: string
  purchasePrice: number | string
  minimumSellingPrice: number | string
  stockQuantity: number | string
  lowStockLevel: number | string
  unit: string
  secondaryUnit: string
  secondaryUnitFactor: number | string
  secondaryUnitPrice: number | string
}

const EMPTY_VALUES: FormValues = {
  name: '',
  sku: '',
  categoryId: '',
  supplierId: '',
  purchasePrice: 0,
  minimumSellingPrice: 0,
  stockQuantity: 0,
  lowStockLevel: 0,
  unit: 'pcs',
  secondaryUnit: '',
  secondaryUnitFactor: 0,
  secondaryUnitPrice: 0
}

export default function ProductFormModal({
  opened,
  onClose,
  product,
  categories,
  suppliers,
  onRequestAddCategory
}: ProductFormModalProps): JSX.Element {
  const queryClient = useQueryClient()
  const isEdit = product !== null

  const form = useForm<FormValues>({
    initialValues: EMPTY_VALUES,
    validate: {
      name: (v) => (v.trim().length === 0 ? 'Name is required' : null),
      sku: (v) => (v.trim().length === 0 ? 'SKU is required' : null),
      categoryId: (v) => (v ? null : 'Select a category'),
      purchasePrice: (v) => (Number(v) >= 0 ? null : 'Must be 0 or more'),
      minimumSellingPrice: (v, values) => {
        const min = Number(v)
        if (Number.isNaN(min) || min < 0) return 'Must be 0 or more'
        if (min < Number(values.purchasePrice)) return 'Must be ≥ purchase price'
        return null
      },
      stockQuantity: (v) => (Number(v) >= 0 ? null : 'Must be 0 or more'),
      lowStockLevel: (v) => (Number(v) >= 0 ? null : 'Must be 0 or more'),
      unit: (v) => (v.trim().length === 0 ? 'Unit is required' : null),
      secondaryUnitFactor: (v, values) => {
        if (values.secondaryUnit.trim().length === 0) return null
        return Number(v) >= 2 ? null : 'A bulk unit must contain at least 2 base units'
      },
      secondaryUnitPrice: (v, values) => {
        if (values.secondaryUnit.trim().length === 0) return null
        return Number(v) > 0 ? null : 'Enter the bulk-unit price'
      }
    }
  })

  useEffect(() => {
    if (!opened) return
    if (product) {
      form.setValues({
        name: product.name,
        sku: product.sku,
        categoryId: String(product.categoryId),
        supplierId: product.supplierId ? String(product.supplierId) : '',
        purchasePrice: product.purchasePrice ?? 0,
        minimumSellingPrice: product.minimumSellingPrice,
        stockQuantity: product.stockQuantity,
        lowStockLevel: product.lowStockLevel,
        unit: product.unit || 'pcs',
        secondaryUnit: product.secondaryUnit ?? '',
        secondaryUnitFactor: product.secondaryUnitFactor || 0,
        secondaryUnitPrice: product.secondaryUnitPrice || 0
      })
    } else {
      form.setValues(EMPTY_VALUES)
    }
    form.resetDirty()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, product])

  const categoryOptions = useMemo(() => {
    const options = categories
      .filter((c) => c.isActive)
      .map((c) => ({ value: String(c.id), label: c.name }))
    if (product && !options.some((o) => o.value === String(product.categoryId))) {
      options.unshift({ value: String(product.categoryId), label: `${product.categoryName} (inactive)` })
    }
    return options
  }, [categories, product])

  const supplierOptions = useMemo(() => {
    const options = suppliers
      .filter((s) => s.isActive)
      .map((s) => ({ value: String(s.id), label: s.name }))
    if (product?.supplierId && !options.some((o) => o.value === String(product.supplierId))) {
      options.unshift({
        value: String(product.supplierId),
        label: `${product.supplierName ?? 'Supplier'} (inactive)`
      })
    }
    return options
  }, [suppliers, product])

  const mutation = useMutation({
    mutationFn: async (request: ProductWriteRequest): Promise<void> => {
      if (product) {
        await updateProduct(product.id, request)
      } else {
        await createProduct(request)
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      notifications.show({ color: 'teal', message: isEdit ? 'Product updated.' : 'Product created.' })
      onClose()
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not save the product.'
      })
    }
  })

  const submit = (values: FormValues): void => {
    mutation.mutate({
      name: values.name.trim(),
      sku: values.sku.trim(),
      categoryId: Number(values.categoryId),
      supplierId: values.supplierId ? Number(values.supplierId) : null,
      purchasePrice: Number(values.purchasePrice),
      minimumSellingPrice: Number(values.minimumSellingPrice),
      stockQuantity: Number(values.stockQuantity),
      lowStockLevel: Number(values.lowStockLevel),
      unit: values.unit.trim() || 'pcs',
      secondaryUnit: values.secondaryUnit.trim() || null,
      secondaryUnitFactor: values.secondaryUnit.trim() ? Number(values.secondaryUnitFactor) : 0,
      secondaryUnitPrice: values.secondaryUnit.trim() ? Number(values.secondaryUnitPrice) : 0
    })
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? `Edit: ${product?.name}` : 'New product'}
      size="lg"
      centered
    >
      <form onSubmit={form.onSubmit(submit)}>
        <Stack>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TextInput label="Product name" withAsterisk {...form.getInputProps('name')} />
            <TextInput label="SKU / Code" withAsterisk {...form.getInputProps('sku')} />
          </SimpleGrid>

          <Group align="flex-end" gap="xs" wrap="nowrap">
            <Select
              label="Category"
              withAsterisk
              searchable
              data={categoryOptions}
              placeholder={categoryOptions.length ? 'Select category' : 'No categories yet'}
              style={{ flex: 1 }}
              {...form.getInputProps('categoryId')}
            />
            <Tooltip label="Add a new category">
              <ActionIcon variant="light" size={36} onClick={onRequestAddCategory} aria-label="Add category">
                <IconPlus size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>

          <Select
            label="Supplier"
            clearable
            searchable
            data={supplierOptions}
            placeholder="Optional"
            {...form.getInputProps('supplierId')}
          />

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <NumberInput
              label="Purchase price"
              withAsterisk
              min={0}
              decimalScale={2}
              step={0.5}
              {...form.getInputProps('purchasePrice')}
            />
            <NumberInput
              label="Minimum selling price"
              withAsterisk
              min={0}
              decimalScale={2}
              step={0.5}
              description="Sales cannot go below this"
              {...form.getInputProps('minimumSellingPrice')}
            />
            <NumberInput
              label="Stock quantity"
              min={0}
              allowDecimal={false}
              disabled={isEdit}
              description={isEdit ? 'Use "Adjust stock" to change (keeps audit log)' : 'Opening stock'}
              {...form.getInputProps('stockQuantity')}
            />
            <NumberInput
              label="Low-stock alert level"
              min={0}
              allowDecimal={false}
              {...form.getInputProps('lowStockLevel')}
            />
            <TextInput
              label="Unit"
              withAsterisk
              description="How this item is stocked & priced (e.g. pcs, kg, m, ft)"
              placeholder="pcs"
              {...form.getInputProps('unit')}
            />
          </SimpleGrid>

          <Divider
            label="Bulk unit (optional) — e.g. sell by the box"
            labelPosition="left"
          />
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
            <TextInput
              label="Bulk unit name"
              placeholder="e.g. box, dozen"
              description="Leave blank to disable"
              {...form.getInputProps('secondaryUnit')}
            />
            <NumberInput
              label={`Base units per ${form.values.secondaryUnit.trim() || 'bulk unit'}`}
              min={0}
              allowDecimal={false}
              placeholder="e.g. 12"
              disabled={form.values.secondaryUnit.trim().length === 0}
              {...form.getInputProps('secondaryUnitFactor')}
            />
            <NumberInput
              label="Bulk unit price"
              min={0}
              decimalScale={2}
              step={0.5}
              description="Default price per bulk unit"
              disabled={form.values.secondaryUnit.trim().length === 0}
              {...form.getInputProps('secondaryUnitPrice')}
            />
          </SimpleGrid>

          {categoryOptions.length === 0 && (
            <Alert color="blue" icon={<IconInfoCircle size={18} />}>
              You need at least one category. Use the <b>+</b> button next to the Category field to create one.
            </Alert>
          )}

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? 'Save changes' : 'Create product'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
