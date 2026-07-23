import { useEffect } from 'react'
import { Button, Group, Modal, NumberInput, Select, Stack, TextInput, Textarea } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import {
  createExpense,
  updateExpense,
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  type Expense
} from '../../api/expenses'

interface ExpenseFormModalProps {
  opened: boolean
  onClose: () => void
  expense: Expense | null
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function ExpenseFormModal({
  opened,
  onClose,
  expense
}: ExpenseFormModalProps): JSX.Element {
  const queryClient = useQueryClient()
  const isEdit = expense !== null

  const form = useForm({
    initialValues: {
      category: 'Rent',
      description: '',
      amount: 0 as number | string,
      paymentMethod: 'Cash',
      expenseDate: today()
    },
    validate: {
      category: (v) => (v.trim().length === 0 ? 'Category is required' : null),
      amount: (v) => (Number(v) > 0 ? null : 'Amount must be greater than 0')
    }
  })

  useEffect(() => {
    if (!opened) return
    if (expense) {
      form.setValues({
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        paymentMethod: expense.paymentMethod,
        expenseDate: expense.expenseDate.slice(0, 10)
      })
    } else {
      form.setValues({
        category: 'Rent',
        description: '',
        amount: 0,
        paymentMethod: 'Cash',
        expenseDate: today()
      })
    }
    form.resetDirty()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, expense])

  const mutation = useMutation({
    mutationFn: async (): Promise<void> => {
      const body = {
        category: form.values.category.trim(),
        description: form.values.description.trim() || null,
        amount: Number(form.values.amount),
        paymentMethod: form.values.paymentMethod,
        expenseDate: form.values.expenseDate || null
      }
      if (expense) {
        await updateExpense(expense.id, body)
      } else {
        await createExpense(body)
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['expenses'] })
      await queryClient.invalidateQueries({ queryKey: ['expense-summary'] })
      notifications.show({ color: 'teal', message: isEdit ? 'Expense updated.' : 'Expense recorded.' })
      onClose()
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not save the expense.'
      })
    }
  })

  return (
    <Modal opened={opened} onClose={onClose} title={isEdit ? 'Edit expense' : 'Record expense'} centered>
      <form onSubmit={form.onSubmit(() => mutation.mutate())}>
        <Stack>
          <Select
            label="Category"
            withAsterisk
            data={EXPENSE_CATEGORIES}
            searchable
            {...form.getInputProps('category')}
          />
          <NumberInput
            label="Amount"
            withAsterisk
            min={0}
            decimalScale={2}
            step={0.5}
            {...form.getInputProps('amount')}
          />
          <Group grow>
            <Select
              label="Payment method"
              data={EXPENSE_PAYMENT_METHODS}
              allowDeselect={false}
              {...form.getInputProps('paymentMethod')}
            />
            <TextInput label="Date" type="date" {...form.getInputProps('expenseDate')} />
          </Group>
          <Textarea
            label="Description"
            placeholder="Optional note (e.g. July shop rent)"
            autosize
            minRows={2}
            {...form.getInputProps('description')}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? 'Save changes' : 'Record expense'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
