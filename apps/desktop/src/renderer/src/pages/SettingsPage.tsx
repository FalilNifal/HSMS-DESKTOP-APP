import { useEffect, useState } from 'react'
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  NumberInput,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip
} from '@mantine/core'
import { IconDeviceFloppy, IconEdit, IconPlus, IconRestore, IconTrash } from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import { getShopSettings, updateShopSettings } from '../api/settings'
import { deactivateCategory, listCategories, reactivateCategory, type Category } from '../api/catalog'
import { useSettingsStore } from '../store/settingsStore'
import CategoryFormModal from '../components/settings/CategoryFormModal'

export default function SettingsPage(): JSX.Element {
  const queryClient = useQueryClient()
  const setShopMeta = useSettingsStore((s) => s.setShopMeta)

  const settingsQuery = useQuery({ queryKey: ['shop-settings'], queryFn: getShopSettings })
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories })

  const [categoryModal, setCategoryModal] = useState<{ opened: boolean; category: Category | null }>({
    opened: false,
    category: null
  })

  const form = useForm({
    initialValues: {
      shopName: '',
      address: '',
      phoneNumber: '',
      currency: '',
      invoiceFooterMessage: '',
      taxRatePercent: 0 as number | string,
      taxLabel: 'Tax'
    },
    validate: {
      shopName: (v) => (v.trim().length === 0 ? 'Shop name is required' : null),
      currency: (v) => (v.trim().length === 0 ? 'Currency is required' : null)
    }
  })

  useEffect(() => {
    if (settingsQuery.data) {
      form.setValues({
        shopName: settingsQuery.data.shopName,
        address: settingsQuery.data.address,
        phoneNumber: settingsQuery.data.phoneNumber,
        currency: settingsQuery.data.currency,
        invoiceFooterMessage: settingsQuery.data.invoiceFooterMessage,
        taxRatePercent: settingsQuery.data.taxRatePercent,
        taxLabel: settingsQuery.data.taxLabel
      })
      form.resetDirty()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsQuery.data])

  const saveMutation = useMutation({
    mutationFn: updateShopSettings,
    onSuccess: async (data) => {
      setShopMeta({
        currency: data.currency,
        shopName: data.shopName,
        taxRatePercent: data.taxRatePercent,
        taxLabel: data.taxLabel
      })
      await queryClient.invalidateQueries({ queryKey: ['shop-settings'] })
      notifications.show({ color: 'teal', message: 'Settings saved.' })
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not save settings.'
      })
    }
  })

  const deactivateCategoryMutation = useMutation({
    mutationFn: (id: number) => deactivateCategory(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
      notifications.show({ color: 'teal', message: 'Category deactivated.' })
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not deactivate the category.'
      })
    }
  })

  const reactivateCategoryMutation = useMutation({
    mutationFn: (id: number) => reactivateCategory(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
      notifications.show({ color: 'teal', message: 'Category reactivated.' })
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not reactivate the category.'
      })
    }
  })

  const categories = categoriesQuery.data ?? []

  return (
    <Stack>
      <Title order={2}>Settings</Title>

      <Card withBorder radius="md" padding="lg">
        <Text fw={600} mb="md">
          Shop profile
        </Text>
        {settingsQuery.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : (
          <form
            onSubmit={form.onSubmit((values) =>
              saveMutation.mutate({ ...values, taxRatePercent: Number(values.taxRatePercent) })
            )}
          >
            <Stack>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <TextInput label="Shop name" withAsterisk {...form.getInputProps('shopName')} />
                <TextInput label="Phone number" {...form.getInputProps('phoneNumber')} />
                <TextInput label="Address" {...form.getInputProps('address')} />
                <TextInput
                  label="Currency"
                  withAsterisk
                  description="Shown on prices and invoices (e.g. LKR, USD)"
                  {...form.getInputProps('currency')}
                />
                <NumberInput
                  label="Tax / VAT rate (%)"
                  min={0}
                  max={100}
                  decimalScale={2}
                  description="0 = no tax added to sales"
                  {...form.getInputProps('taxRatePercent')}
                />
                <TextInput
                  label="Tax label"
                  description="e.g. VAT, GST, NBT"
                  {...form.getInputProps('taxLabel')}
                />
              </SimpleGrid>
              <Textarea
                label="Invoice footer message"
                autosize
                minRows={2}
                {...form.getInputProps('invoiceFooterMessage')}
              />
              <Group justify="flex-end">
                <Button
                  type="submit"
                  leftSection={<IconDeviceFloppy size={18} />}
                  loading={saveMutation.isPending}
                >
                  Save changes
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Card>

      <Card withBorder radius="md" padding={0}>
        <Group justify="space-between" p="md">
          <Text fw={600}>Product categories</Text>
          <Button
            size="xs"
            leftSection={<IconPlus size={16} />}
            onClick={() => setCategoryModal({ opened: true, category: null })}
          >
            Add category
          </Button>
        </Group>

        {categoriesQuery.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : categories.length === 0 ? (
          <Center py={40}>
            <Text c="dimmed">No categories yet.</Text>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={520}>
            <Table verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th ta="right">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {categories.map((category) => (
                  <Table.Tr key={category.id} opacity={category.isActive ? 1 : 0.55}>
                    <Table.Td>
                      <Text fw={500}>{category.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" lineClamp={1}>
                        {category.description || '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        variant={category.isActive ? 'light' : 'outline'}
                        color={category.isActive ? 'green' : 'gray'}
                      >
                        {category.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <Tooltip label="Edit">
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            onClick={() => setCategoryModal({ opened: true, category })}
                          >
                            <IconEdit size={18} />
                          </ActionIcon>
                        </Tooltip>
                        {category.isActive ? (
                          <Tooltip label="Deactivate">
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              loading={deactivateCategoryMutation.isPending}
                              onClick={() => deactivateCategoryMutation.mutate(category.id)}
                            >
                              <IconTrash size={18} />
                            </ActionIcon>
                          </Tooltip>
                        ) : (
                          <Tooltip label="Reactivate">
                            <ActionIcon
                              variant="subtle"
                              color="green"
                              loading={reactivateCategoryMutation.isPending}
                              onClick={() => reactivateCategoryMutation.mutate(category.id)}
                            >
                              <IconRestore size={18} />
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

      <CategoryFormModal
        opened={categoryModal.opened}
        category={categoryModal.category}
        onClose={() => setCategoryModal({ opened: false, category: null })}
      />
    </Stack>
  )
}
