import { useEffect, useState } from 'react'
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Center,
  FileInput,
  Group,
  Image,
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
import { IconDeviceFloppy, IconEdit, IconPhoto, IconPlus, IconRestore, IconTrash } from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import { getShopSettings, updateShopSettings } from '../api/settings'
import { deactivateCategory, listCategories, reactivateCategory, type Category } from '../api/catalog'
import { useSettingsStore } from '../store/settingsStore'
import { deriveAccentFromLogo } from '../lib/logoTheme'
import CategoryFormModal from '../components/settings/CategoryFormModal'

/** Reads an image file and returns a downscaled PNG data URL (keeps the stored logo small). */
async function fileToScaledDataUrl(file: File, max = 256): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  const img = new window.Image()
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
    img.src = dataUrl
  })
  const scale = Math.min(1, max / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL('image/png')
}

export default function SettingsPage(): JSX.Element {
  const queryClient = useQueryClient()
  const setShopMeta = useSettingsStore((s) => s.setShopMeta)
  const setAccentColor = useSettingsStore((s) => s.setAccentColor)

  const settingsQuery = useQuery({ queryKey: ['shop-settings'], queryFn: getShopSettings })
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories })

  const [categoryModal, setCategoryModal] = useState<{ opened: boolean; category: Category | null }>({
    opened: false,
    category: null
  })
  const [logo, setLogo] = useState<string | null>(null)

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
      setLogo(settingsQuery.data.logo)
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
        taxLabel: data.taxLabel,
        logo: data.logo
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
              saveMutation.mutate({ ...values, taxRatePercent: Number(values.taxRatePercent), logo })
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

              <div>
                <Text size="sm" fw={500} mb={2}>
                  Shop logo (optional)
                </Text>
                <Text size="xs" c="dimmed" mb="xs">
                  Upload your shop&apos;s logo to print it on invoices &amp; receipts. If left empty,
                  no logo is printed — the app&apos;s default logo is never shown on customer bills.
                </Text>
                <Group align="flex-start" gap="md">
                  {logo ? (
                    <Image src={logo} w={72} h={72} fit="contain" radius="sm" />
                  ) : (
                    <Center w={72} h={72} bg="gray.1" style={{ borderRadius: 8 }}>
                      <IconPhoto size={28} opacity={0.5} />
                    </Center>
                  )}
                  <Stack gap="xs">
                    <FileInput
                      accept="image/png,image/jpeg,image/webp"
                      placeholder="Choose image…"
                      leftSection={<IconPhoto size={16} />}
                      value={null}
                      w={240}
                      onChange={async (file) => {
                        if (!file) return
                        try {
                          const dataUrl = await fileToScaledDataUrl(file)
                          setLogo(dataUrl)
                          setAccentColor(await deriveAccentFromLogo(dataUrl)) // live theme preview
                        } catch {
                          notifications.show({ color: 'red', message: 'Could not read that image.' })
                        }
                      }}
                    />
                    {logo && (
                      <Button
                        variant="subtle"
                        color="red"
                        size="xs"
                        w="fit-content"
                        onClick={() => {
                          setLogo(null)
                          setAccentColor(null)
                        }}
                      >
                        Remove logo
                      </Button>
                    )}
                  </Stack>
                </Group>
              </div>

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
