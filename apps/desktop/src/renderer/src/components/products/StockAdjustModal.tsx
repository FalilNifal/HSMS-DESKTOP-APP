import { useEffect } from 'react'
import { Badge, Button, Group, Modal, NumberInput, Stack, Text, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { updateStock, type Product } from '../../api/products'

interface StockAdjustModalProps {
  opened: boolean
  onClose: () => void
  product: Product | null
}

interface FormValues {
  newQuantity: number | string
  reason: string
}

export default function StockAdjustModal({
  opened,
  onClose,
  product
}: StockAdjustModalProps): JSX.Element {
  const queryClient = useQueryClient()

  const form = useForm<FormValues>({
    initialValues: { newQuantity: 0, reason: '' },
    validate: {
      newQuantity: (v) => (Number(v) >= 0 ? null : 'Must be 0 or more'),
      reason: (v) => (v.trim().length === 0 ? 'A reason is required for the audit log' : null)
    }
  })

  useEffect(() => {
    if (opened && product) {
      form.setValues({ newQuantity: product.stockQuantity, reason: '' })
      form.resetDirty()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, product])

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      updateStock(product!.id, {
        newQuantity: Number(values.newQuantity),
        reason: values.reason.trim()
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] })
      notifications.show({ color: 'teal', message: 'Stock updated.' })
      onClose()
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not update stock.'
      })
    }
  })

  const newQty = Number(form.values.newQuantity)
  const delta = product ? newQty - product.stockQuantity : 0

  return (
    <Modal opened={opened} onClose={onClose} title="Adjust stock" centered>
      {product && (
        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Stack>
            <Group justify="space-between">
              <Text fw={500}>{product.name}</Text>
              <Text size="sm" c="dimmed">
                Current: <b>{product.stockQuantity}</b>
              </Text>
            </Group>

            <NumberInput
              label="New quantity"
              withAsterisk
              min={0}
              allowDecimal={false}
              data-autofocus
              {...form.getInputProps('newQuantity')}
            />

            {delta !== 0 && !Number.isNaN(delta) && (
              <Badge color={delta > 0 ? 'teal' : 'orange'} variant="light" w="fit-content">
                {delta > 0 ? `+${delta}` : delta} change
              </Badge>
            )}

            <TextInput
              label="Reason"
              withAsterisk
              placeholder="e.g. New stock received, Damage, Stock count correction"
              {...form.getInputProps('reason')}
            />

            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" loading={mutation.isPending}>
                Save
              </Button>
            </Group>
          </Stack>
        </form>
      )}
    </Modal>
  )
}
