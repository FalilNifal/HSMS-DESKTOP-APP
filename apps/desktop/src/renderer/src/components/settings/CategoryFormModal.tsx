import { useEffect } from 'react'
import { Button, Group, Modal, Stack, TextInput, Textarea } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { createCategory, updateCategory, type Category } from '../../api/catalog'

interface CategoryFormModalProps {
  opened: boolean
  onClose: () => void
  category: Category | null
}

export default function CategoryFormModal({
  opened,
  onClose,
  category
}: CategoryFormModalProps): JSX.Element {
  const queryClient = useQueryClient()
  const isEdit = category !== null

  const form = useForm({
    initialValues: { name: '', description: '' },
    validate: {
      name: (v) => (v.trim().length === 0 ? 'Category name is required' : null)
    }
  })

  useEffect(() => {
    if (!opened) return
    form.setValues({ name: category?.name ?? '', description: category?.description ?? '' })
    form.resetDirty()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, category])

  const mutation = useMutation({
    mutationFn: async (values: { name: string; description: string }): Promise<void> => {
      const body = { name: values.name.trim(), description: values.description.trim() || null }
      if (category) {
        await updateCategory(category.id, body)
      } else {
        await createCategory(body)
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] })
      notifications.show({ color: 'teal', message: isEdit ? 'Category updated.' : 'Category created.' })
      onClose()
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not save the category.'
      })
    }
  })

  return (
    <Modal opened={opened} onClose={onClose} title={isEdit ? 'Edit category' : 'New category'} centered>
      <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
        <Stack>
          <TextInput label="Name" withAsterisk data-autofocus {...form.getInputProps('name')} />
          <Textarea label="Description" autosize minRows={2} {...form.getInputProps('description')} />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? 'Save changes' : 'Create category'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
