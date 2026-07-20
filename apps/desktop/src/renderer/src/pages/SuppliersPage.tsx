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
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip
} from '@mantine/core'
import { IconAlertTriangle, IconEdit, IconPlus, IconRestore, IconSearch, IconTrash, IconTruckOff } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import { deactivateSupplier, listSuppliers, reactivateSupplier, type Supplier } from '../api/catalog'
import SupplierFormModal from '../components/suppliers/SupplierFormModal'

export default function SuppliersPage(): JSX.Element {
  const queryClient = useQueryClient()
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: listSuppliers })

  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [formState, setFormState] = useState<{ opened: boolean; supplier: Supplier | null }>({
    opened: false,
    supplier: null
  })
  const [deactivateTarget, setDeactivateTarget] = useState<Supplier | null>(null)

  const deactivateMutation = useMutation({
    mutationFn: (supplier: Supplier) => deactivateSupplier(supplier.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      notifications.show({ color: 'teal', message: 'Supplier deactivated.' })
      setDeactivateTarget(null)
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not deactivate the supplier.'
      })
    }
  })

  const reactivateMutation = useMutation({
    mutationFn: (supplier: Supplier) => reactivateSupplier(supplier.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      notifications.show({ color: 'teal', message: 'Supplier reactivated.' })
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not reactivate the supplier.'
      })
    }
  })

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (suppliersQuery.data ?? [])
      .filter((s) => (showInactive ? true : s.isActive))
      .filter((s) =>
        term.length === 0
          ? true
          : s.name.toLowerCase().includes(term) ||
            (s.contactPerson ?? '').toLowerCase().includes(term) ||
            (s.phoneNumber ?? '').toLowerCase().includes(term)
      )
  }, [suppliersQuery.data, search, showInactive])

  return (
    <Stack>
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Suppliers</Title>
          <Text c="dimmed">{suppliersQuery.data?.length ?? 0} suppliers</Text>
        </div>
        <Button
          leftSection={<IconPlus size={18} />}
          onClick={() => setFormState({ opened: true, supplier: null })}
        >
          Add supplier
        </Button>
      </Group>

      <Group justify="space-between">
        <TextInput
          placeholder="Search by name, contact or phone…"
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

      {suppliersQuery.isError && (
        <Alert color="red" icon={<IconAlertTriangle size={18} />}>
          Failed to load suppliers.
        </Alert>
      )}

      <Card withBorder padding={0} radius="md">
        {suppliersQuery.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : filtered.length === 0 ? (
          <Center py={48}>
            <Stack align="center" gap="xs">
              <IconTruckOff size={40} opacity={0.5} />
              <Text c="dimmed">
                {suppliersQuery.data?.length ? 'No suppliers match your search.' : 'No suppliers yet.'}
              </Text>
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={720}>
            <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Contact person</Table.Th>
                  <Table.Th>Phone</Table.Th>
                  <Table.Th>Address</Table.Th>
                  <Table.Th ta="right">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.map((supplier) => (
                  <Table.Tr key={supplier.id} opacity={supplier.isActive ? 1 : 0.55}>
                    <Table.Td>
                      <Group gap={6}>
                        <Text fw={500}>{supplier.name}</Text>
                        {!supplier.isActive && (
                          <Badge size="xs" color="gray" variant="light">
                            Inactive
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>{supplier.contactPerson ?? '—'}</Table.Td>
                    <Table.Td>{supplier.phoneNumber ?? '—'}</Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" lineClamp={1}>
                        {supplier.address ?? '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <Tooltip label="Edit">
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            onClick={() => setFormState({ opened: true, supplier })}
                          >
                            <IconEdit size={18} />
                          </ActionIcon>
                        </Tooltip>
                        {supplier.isActive ? (
                          <Tooltip label="Deactivate">
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              onClick={() => setDeactivateTarget(supplier)}
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
                                reactivateMutation.variables?.id === supplier.id
                              }
                              onClick={() => reactivateMutation.mutate(supplier)}
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

      <SupplierFormModal
        opened={formState.opened}
        supplier={formState.supplier}
        onClose={() => setFormState({ opened: false, supplier: null })}
      />

      <Modal
        opened={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        title="Deactivate supplier"
        centered
      >
        <Stack>
          <Text>
            Deactivate <b>{deactivateTarget?.name}</b>? Products linked to this supplier keep their
            history; the supplier just won't be selectable for new products.
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
