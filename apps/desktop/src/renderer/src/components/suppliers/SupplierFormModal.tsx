import { useEffect } from 'react'
import { Button, Group, Modal, Stack, TextInput, Textarea } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { createSupplier, updateSupplier, type Supplier } from '../../api/catalog'

interface SupplierFormModalProps {
  opened: boolean
  onClose: () => void
  supplier: Supplier | null
}

interface FormValues {
  name: string
  contactPerson: string
  phoneNumber: string
  address: string
}

export default function SupplierFormModal({
  opened,
  onClose,
  supplier
}: SupplierFormModalProps): JSX.Element {
  const queryClient = useQueryClient()
  const isEdit = supplier !== null

  const form = useForm<FormValues>({
    initialValues: { name: '', contactPerson: '', phoneNumber: '', address: '' },
    validate: {
      name: (v) => (v.trim().length === 0 ? 'Supplier name is required' : null)
    }
  })

  useEffect(() => {
    if (!opened) return
    if (supplier) {
      form.setValues({
        name: supplier.name,
        contactPerson: supplier.contactPerson ?? '',
        phoneNumber: supplier.phoneNumber ?? '',
        address: supplier.address ?? ''
      })
    } else {
      form.setValues({ name: '', contactPerson: '', phoneNumber: '', address: '' })
    }
    form.resetDirty()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, supplier])

  const mutation = useMutation({
    mutationFn: async (values: FormValues): Promise<void> => {
      const body = {
        name: values.name.trim(),
        contactPerson: values.contactPerson.trim() || null,
        phoneNumber: values.phoneNumber.trim() || null,
        address: values.address.trim() || null
      }
      if (supplier) {
        await updateSupplier(supplier.id, body)
      } else {
        await createSupplier(body)
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      notifications.show({ color: 'teal', message: isEdit ? 'Supplier updated.' : 'Supplier created.' })
      onClose()
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not save the supplier.'
      })
    }
  })

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? `Edit: ${supplier?.name}` : 'New supplier'}
      centered
    >
      <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
        <Stack>
          <TextInput label="Supplier name" withAsterisk {...form.getInputProps('name')} />
          <TextInput label="Contact person" {...form.getInputProps('contactPerson')} />
          <TextInput label="Phone number" {...form.getInputProps('phoneNumber')} />
          <Textarea label="Address" autosize minRows={2} {...form.getInputProps('address')} />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? 'Save changes' : 'Create supplier'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
