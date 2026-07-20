import { useEffect } from 'react'
import { Button, Group, Modal, NumberInput, Select, Stack, Text, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { recordPayment, type Customer } from '../../api/customers'
import { formatMoney } from '../../lib/format'

interface RecordPaymentModalProps {
  customer: Customer | null
  onClose: () => void
}

const METHODS = ['Cash', 'Card', 'Mobile', 'Cheque', 'Bank Transfer']

interface FormValues {
  amount: number | string
  method: string
  note: string
}

export default function RecordPaymentModal({
  customer,
  onClose
}: RecordPaymentModalProps): JSX.Element {
  const queryClient = useQueryClient()

  const form = useForm<FormValues>({
    initialValues: { amount: 0, method: 'Cash', note: '' },
    validate: {
      amount: (v) => (Number(v) > 0 ? null : 'Enter an amount greater than 0')
    }
  })

  useEffect(() => {
    if (customer) {
      form.setValues({ amount: customer.outstandingBalance > 0 ? customer.outstandingBalance : 0, method: 'Cash', note: '' })
      form.resetDirty()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer])

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      recordPayment(customer!.id, {
        amount: Number(values.amount),
        method: values.method,
        note: values.note.trim() || null
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
        queryClient.invalidateQueries({ queryKey: ['customer-ledger', customer?.id] })
      ])
      notifications.show({ color: 'teal', message: 'Payment recorded.' })
      onClose()
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not record the payment.'
      })
    }
  })

  return (
    <Modal opened={customer !== null} onClose={onClose} title="Record payment" centered>
      {customer && (
        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Stack>
            <Group justify="space-between">
              <Text fw={500}>{customer.name}</Text>
              <Text size="sm" c="dimmed">
                Owes: <b>{formatMoney(customer.outstandingBalance)}</b>
              </Text>
            </Group>
            <NumberInput
              label="Amount received"
              withAsterisk
              min={0}
              decimalScale={2}
              step={100}
              data-autofocus
              {...form.getInputProps('amount')}
            />
            <Select label="Method" data={METHODS} allowDeselect={false} {...form.getInputProps('method')} />
            <TextInput label="Note" placeholder="Optional" {...form.getInputProps('note')} />
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" loading={mutation.isPending}>
                Record payment
              </Button>
            </Group>
          </Stack>
        </form>
      )}
    </Modal>
  )
}
