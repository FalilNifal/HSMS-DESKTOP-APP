import { Alert, Button, Group, Modal, PasswordInput, Stack, TextInput } from '@mantine/core'
import { IconShieldLock } from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useMutation } from '@tanstack/react-query'
import { recoverAdminPassword } from '../api/account'
import { ApiError } from '../api/client'

interface RecoverPasswordModalProps {
  opened: boolean
  onClose: () => void
}

export default function RecoverPasswordModal({
  opened,
  onClose
}: RecoverPasswordModalProps): JSX.Element {
  const form = useForm({
    initialValues: { adminUsername: '', recoveryKey: '', newPassword: '', confirmPassword: '' },
    validate: {
      adminUsername: (v) => (v.trim().length === 0 ? 'Enter the admin username' : null),
      recoveryKey: (v) => (v.trim().length === 0 ? 'Enter your recovery key' : null),
      newPassword: (v) => (v.length < 8 ? 'At least 8 characters' : null),
      confirmPassword: (v, values) => (v !== values.newPassword ? 'Passwords do not match' : null)
    }
  })

  const mutation = useMutation({
    mutationFn: recoverAdminPassword,
    onSuccess: () => {
      notifications.show({
        color: 'teal',
        title: 'Password reset',
        message: 'You can now sign in with your new password.'
      })
      form.reset()
      onClose()
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not reset the password.'
      })
    }
  })

  const handleClose = (): void => {
    form.reset()
    onClose()
  }

  return (
    <Modal opened={opened} onClose={handleClose} title="Reset admin password" centered>
      <form
        onSubmit={form.onSubmit((values) =>
          mutation.mutate({
            adminUsername: values.adminUsername.trim(),
            recoveryKey: values.recoveryKey.trim(),
            newPassword: values.newPassword
          })
        )}
      >
        <Stack>
          <Alert color="blue" icon={<IconShieldLock size={18} />}>
            Enter the one-time <b>recovery key</b> you saved during first-time setup to reset the
            administrator password.
          </Alert>
          <TextInput
            label="Admin username"
            withAsterisk
            data-autofocus
            {...form.getInputProps('adminUsername')}
          />
          <TextInput
            label="Recovery key"
            placeholder="HSMS-RK-XXXX-XXXX-XXXX-XXXX"
            withAsterisk
            {...form.getInputProps('recoveryKey')}
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
              Reset password
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
