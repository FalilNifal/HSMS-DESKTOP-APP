import { Button, Group, Modal, PasswordInput, Stack, Text } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useMutation } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { resetUserPassword, type User } from '../../api/users'

interface ResetPasswordModalProps {
  user: User | null
  onClose: () => void
}

export default function ResetPasswordModal({ user, onClose }: ResetPasswordModalProps): JSX.Element {
  const form = useForm({
    initialValues: { newPassword: '', confirmPassword: '' },
    validate: {
      newPassword: (v) => (v.length < 8 ? 'At least 8 characters' : null),
      confirmPassword: (v, values) => (v !== values.newPassword ? 'Passwords do not match' : null)
    }
  })

  const mutation = useMutation({
    mutationFn: (newPassword: string) => resetUserPassword(user!.id, newPassword),
    onSuccess: () => {
      notifications.show({ color: 'teal', message: 'Password reset.' })
      form.reset()
      onClose()
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not reset password.'
      })
    }
  })

  const handleClose = (): void => {
    form.reset()
    onClose()
  }

  return (
    <Modal opened={user !== null} onClose={handleClose} title="Reset password" centered>
      <form onSubmit={form.onSubmit((values) => mutation.mutate(values.newPassword))}>
        <Stack>
          <Text size="sm" c="dimmed">
            Set a new password for <b>{user?.fullName}</b> ({user?.username}).
          </Text>
          <PasswordInput label="New password" withAsterisk data-autofocus {...form.getInputProps('newPassword')} />
          <PasswordInput label="Confirm password" withAsterisk {...form.getInputProps('confirmPassword')} />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Reset password
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
