import { Button, Group, Modal, Stack, TextInput, Textarea } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createCategory, type Category } from '../../api/catalog'
import { ApiError } from '../../api/client'

interface CategoryQuickModalProps {
  opened: boolean
  onClose: () => void
  onCreated: (category: Category) => void
}

export default function CategoryQuickModal({
  opened,
  onClose,
  onCreated
}: CategoryQuickModalProps): JSX.Element {
  const queryClient = useQueryClient()

  const form = useForm({
    initialValues: { name: '', description: '' },
    validate: {
      name: (v) => (v.trim().length === 0 ? 'Category name is required' : null)
    }
  })

  const mutation = useMutation({
    mutationFn: createCategory,
    onSuccess: async (category) => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
      notifications.show({ color: 'teal', message: `Category "${category.name}" created.` })
      form.reset()
      onCreated(category)
      onClose()
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Failed to create category.'
      })
    }
  })

  const handleClose = (): void => {
    form.reset()
    onClose()
  }

  return (
    <Modal opened={opened} onClose={handleClose} title="New category" centered>
      <form
        onSubmit={form.onSubmit((values) =>
          mutation.mutate({ name: values.name.trim(), description: values.description.trim() || null })
        )}
      >
        <Stack>
          <TextInput label="Name" withAsterisk data-autofocus {...form.getInputProps('name')} />
          <Textarea label="Description" autosize minRows={2} {...form.getInputProps('description')} />
          <Group justify="flex-end">
            <Button variant="default" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Create
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
