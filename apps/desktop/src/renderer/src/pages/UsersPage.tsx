import { useState } from 'react'
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
  Table,
  Text,
  Title,
  Tooltip
} from '@mantine/core'
import { IconAlertTriangle, IconEdit, IconKey, IconPlus, IconUserCheck, IconUserOff } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import { deactivateUser, listUsers, updateUser, type User } from '../api/users'
import { useCurrentUser, type UserRole } from '../store/authStore'
import { formatDate } from '../lib/format'
import UserFormModal from '../components/users/UserFormModal'
import ResetPasswordModal from '../components/users/ResetPasswordModal'

const ROLE_COLORS: Record<UserRole, string> = {
  Admin: 'grape',
  Manager: 'blue',
  Cashier: 'teal'
}

export default function UsersPage(): JSX.Element {
  const queryClient = useQueryClient()
  const currentUser = useCurrentUser()
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: listUsers })

  const [formState, setFormState] = useState<{ opened: boolean; user: User | null }>({
    opened: false,
    user: null
  })
  const [resetUser, setResetUser] = useState<User | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null)

  const deactivateMutation = useMutation({
    mutationFn: (user: User) => deactivateUser(user.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      notifications.show({ color: 'teal', message: 'User deactivated.' })
      setDeactivateTarget(null)
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not deactivate the user.'
      })
    }
  })

  const reactivateMutation = useMutation({
    mutationFn: (user: User) =>
      updateUser(user.id, { fullName: user.fullName, role: user.role, isActive: true }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      notifications.show({ color: 'teal', message: 'User reactivated.' })
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not reactivate the user.'
      })
    }
  })

  const users = usersQuery.data ?? []

  return (
    <Stack>
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Users</Title>
          <Text c="dimmed">Manage staff accounts and roles</Text>
        </div>
        <Button
          leftSection={<IconPlus size={18} />}
          onClick={() => setFormState({ opened: true, user: null })}
        >
          Add user
        </Button>
      </Group>

      {usersQuery.isError && (
        <Alert color="red" icon={<IconAlertTriangle size={18} />}>
          Failed to load users.
        </Alert>
      )}

      <Card withBorder padding={0} radius="md">
        {usersQuery.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : users.length === 0 ? (
          <Center py={48}>
            <Text c="dimmed">No users yet.</Text>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={720}>
            <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Full name</Table.Th>
                  <Table.Th>Username</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th ta="right">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {users.map((user) => {
                  const isSelf = currentUser?.id === user.id
                  return (
                    <Table.Tr key={user.id} opacity={user.isActive ? 1 : 0.55}>
                      <Table.Td>
                        <Group gap={6}>
                          <Text fw={500}>{user.fullName}</Text>
                          {isSelf && (
                            <Badge size="xs" variant="light" color="gray">
                              You
                            </Badge>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {user.username}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color={ROLE_COLORS[user.role]}>
                          {user.role}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant={user.isActive ? 'light' : 'outline'} color={user.isActive ? 'green' : 'gray'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{formatDate(user.createdAt)}</Table.Td>
                      <Table.Td>
                        <Group gap={4} justify="flex-end" wrap="nowrap">
                          <Tooltip label="Edit">
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              onClick={() => setFormState({ opened: true, user })}
                            >
                              <IconEdit size={18} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Reset password">
                            <ActionIcon variant="subtle" color="blue" onClick={() => setResetUser(user)}>
                              <IconKey size={18} />
                            </ActionIcon>
                          </Tooltip>
                          {user.isActive && !isSelf && (
                            <Tooltip label="Deactivate">
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                onClick={() => setDeactivateTarget(user)}
                              >
                                <IconUserOff size={18} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                          {!user.isActive && (
                            <Tooltip label="Reactivate">
                              <ActionIcon
                                variant="subtle"
                                color="green"
                                loading={
                                  reactivateMutation.isPending &&
                                  reactivateMutation.variables?.id === user.id
                                }
                                onClick={() => reactivateMutation.mutate(user)}
                              >
                                <IconUserCheck size={18} />
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

      <UserFormModal
        opened={formState.opened}
        user={formState.user}
        onClose={() => setFormState({ opened: false, user: null })}
      />

      <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />

      <Modal
        opened={deactivateTarget !== null}
        onClose={() => setDeactivateTarget(null)}
        title="Deactivate user"
        centered
      >
        <Stack>
          <Text>
            Deactivate <b>{deactivateTarget?.fullName}</b>? They will no longer be able to sign in.
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
