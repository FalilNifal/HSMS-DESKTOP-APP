import { useEffect } from 'react'
import { Button, Group, Modal, PasswordInput, Select, Stack, Switch, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { createUser, updateUser, type User } from '../../api/users'
import type { UserRole } from '../../store/authStore'

interface UserFormModalProps {
  opened: boolean
  onClose: () => void
  user: User | null
}

const ROLES: UserRole[] = ['Admin', 'Manager', 'Cashier']

interface FormValues {
  fullName: string
  username: string
  password: string
  role: UserRole
  isActive: boolean
}

export default function UserFormModal({ opened, onClose, user }: UserFormModalProps): JSX.Element {
  const queryClient = useQueryClient()
  const isEdit = user !== null

  const form = useForm<FormValues>({
    initialValues: { fullName: '', username: '', password: '', role: 'Cashier', isActive: true },
    validate: {
      fullName: (v) => (v.trim().length === 0 ? 'Full name is required' : null),
      username: (v) => (!isEdit && v.trim().length < 3 ? 'At least 3 characters' : null),
      password: (v) => (!isEdit && v.length < 8 ? 'At least 8 characters' : null)
    }
  })

  useEffect(() => {
    if (!opened) return
    if (user) {
      form.setValues({
        fullName: user.fullName,
        username: user.username,
        password: '',
        role: user.role,
        isActive: user.isActive
      })
    } else {
      form.setValues({ fullName: '', username: '', password: '', role: 'Cashier', isActive: true })
    }
    form.resetDirty()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, user])

  const mutation = useMutation({
    mutationFn: async (values: FormValues): Promise<void> => {
      if (user) {
        await updateUser(user.id, {
          fullName: values.fullName.trim(),
          role: values.role,
          isActive: values.isActive
        })
      } else {
        await createUser({
          fullName: values.fullName.trim(),
          username: values.username.trim(),
          password: values.password,
          role: values.role
        })
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      notifications.show({ color: 'teal', message: isEdit ? 'User updated.' : 'User created.' })
      onClose()
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not save the user.'
      })
    }
  })

  return (
    <Modal opened={opened} onClose={onClose} title={isEdit ? `Edit: ${user?.fullName}` : 'New user'} centered>
      <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
        <Stack>
          <TextInput label="Full name" withAsterisk {...form.getInputProps('fullName')} />
          <TextInput
            label="Username"
            withAsterisk={!isEdit}
            disabled={isEdit}
            description={isEdit ? 'Username cannot be changed' : undefined}
            {...form.getInputProps('username')}
          />
          {!isEdit && (
            <PasswordInput
              label="Password"
              withAsterisk
              description="At least 8 characters"
              {...form.getInputProps('password')}
            />
          )}
          <Select
            label="Role"
            withAsterisk
            data={ROLES}
            allowDeselect={false}
            {...form.getInputProps('role')}
          />
          {isEdit && (
            <Switch
              label="Active"
              checked={form.values.isActive}
              onChange={(e) => form.setFieldValue('isActive', e.currentTarget.checked)}
            />
          )}
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? 'Save changes' : 'Create user'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
