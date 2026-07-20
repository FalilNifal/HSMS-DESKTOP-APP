import { Button, Group, Modal, PasswordInput, Stack } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useMutation } from '@tanstack/react-query'
import { changePassword } from '../api/account'
import { ApiError } from '../api/client'

interface ChangePasswordModalProps {
  opened: boolean
  onClose: () => void
}

export default function ChangePasswordModal({
  opened,
  onClose
}: ChangePasswordModalProps): JSX.Element {
  const form = useForm({
    initialValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    validate: {
      currentPassword: (v) => (v.length === 0 ? 'Enter your current password' : null),
      newPassword: (v) => (v.length < 8 ? 'At least 8 characters' : null),
      confirmPassword: (v, values) => (v !== values.newPassword ? 'Passwords do not match' : null)
    }
  })

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      notifications.show({ color: 'teal', message: 'Password changed successfully.' })
      form.reset()
      onClose()
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not change password.'
      })
    }
  })

  const handleClose = (): void => {
    form.reset()
    onClose()
  }

  return (
    <Modal opened={opened} onClose={handleClose} title="Change password" centered>
      <form
        onSubmit={form.onSubmit((values) =>
          mutation.mutate({ currentPassword: values.currentPassword, newPassword: values.newPassword })
        )}
      >
        <Stack>
          <PasswordInput
            label="Current password"
            withAsterisk
            data-autofocus
            {...form.getInputProps('currentPassword')}
          />
          <PasswordInput label="New password" withAsterisk {...form.getInputProps('newPassword')} />
          <PasswordInput
            label="Confirm new password"
            withAsterisk
            {...form.getInputProps('confirmPassword')}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Change password
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
