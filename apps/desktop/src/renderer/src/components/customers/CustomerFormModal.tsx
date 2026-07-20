import { useEffect } from 'react'
import { Button, Group, Modal, NumberInput, Stack, TextInput, Textarea } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { createCustomer, updateCustomer, type Customer } from '../../api/customers'

interface CustomerFormModalProps {
  opened: boolean
  onClose: () => void
  customer: Customer | null
}

interface FormValues {
  name: string
  phoneNumber: string
  address: string
  creditLimit: number | string
  notes: string
}

export default function CustomerFormModal({
  opened,
  onClose,
  customer
}: CustomerFormModalProps): JSX.Element {
  const queryClient = useQueryClient()
  const isEdit = customer !== null

  const form = useForm<FormValues>({
    initialValues: { name: '', phoneNumber: '', address: '', creditLimit: 0, notes: '' },
    validate: {
      name: (v) => (v.trim().length === 0 ? 'Customer name is required' : null),
      creditLimit: (v) => (Number(v) >= 0 ? null : 'Must be 0 or more')
    }
  })

  useEffect(() => {
    if (!opened) return
    if (customer) {
      form.setValues({
        name: customer.name,
        phoneNumber: customer.phoneNumber ?? '',
        address: customer.address ?? '',
        creditLimit: customer.creditLimit,
        notes: customer.notes ?? ''
      })
    } else {
      form.setValues({ name: '', phoneNumber: '', address: '', creditLimit: 0, notes: '' })
    }
    form.resetDirty()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, customer])

  const mutation = useMutation({
    mutationFn: async (values: FormValues): Promise<void> => {
      const body = {
        name: values.name.trim(),
        phoneNumber: values.phoneNumber.trim() || null,
        address: values.address.trim() || null,
        creditLimit: Number(values.creditLimit),
        notes: values.notes.trim() || null
      }
      if (customer) {
        await updateCustomer(customer.id, body)
      } else {
        await createCustomer(body)
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] })
      notifications.show({ color: 'teal', message: isEdit ? 'Customer updated.' : 'Customer added.' })
      onClose()
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not save the customer.'
      })
    }
  })

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEdit ? `Edit: ${customer?.name}` : 'New customer'}
      centered
    >
      <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
        <Stack>
          <TextInput label="Name" withAsterisk {...form.getInputProps('name')} />
          <TextInput label="Phone number" {...form.getInputProps('phoneNumber')} />
          <TextInput label="Address" {...form.getInputProps('address')} />
          <NumberInput
            label="Credit limit"
            min={0}
            decimalScale={2}
            step={1000}
            description="Maximum they can owe. 0 = no limit."
            {...form.getInputProps('creditLimit')}
          />
          <Textarea label="Notes" autosize minRows={2} {...form.getInputProps('notes')} />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? 'Save changes' : 'Add customer'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
