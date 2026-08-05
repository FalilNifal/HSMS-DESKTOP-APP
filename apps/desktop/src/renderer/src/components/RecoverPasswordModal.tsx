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
      recoveryKey: (v) => (v.trim().length === 0 ? 'Enter your recovery key' : null),
      newPassword: (v) => (v.length < 8 ? 'At least 8 characters' : null),
      confirmPassword: (v, values) => (v !== values.newPassword ? 'Passwords do not match' : null)
    }
  })

  const mutation = useMutation({
    mutationFn: recoverAdminPassword,
    onSuccess: (data) => {
      notifications.show({
        color: 'teal',
        title: 'Password reset',
        message: `Sign in as "${data.username}" with your new password.`,
        autoClose: 8000
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
            adminUsername: values.adminUsername.trim() || undefined,
            recoveryKey: values.recoveryKey.trim(),
            newPassword: values.newPassword
          })
        )}
      >
        <Stack>
          <Alert color="blue" icon={<IconShieldLock size={18} />}>
            Enter the one-time <b>recovery key</b> you saved at first-time setup. You don't need your
            username — leave it blank and we'll reset the main administrator and show you its
            username.
          </Alert>
          <TextInput
            label="Admin username (optional)"
            description="Leave blank if you don't remember it"
            {...form.getInputProps('adminUsername')}
          />
          <TextInput
            label="Recovery key"
            placeholder="HSMS-RK-XXXX-XXXX-XXXX-XXXX"
            withAsterisk
            data-autofocus
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
