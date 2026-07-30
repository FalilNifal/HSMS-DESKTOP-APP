import { Center, Loader, Modal, Text } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { listProductStockLogs } from '../../api/stocklogs'
import StockLogTable from '../stock/StockLogTable'

interface ProductStockLogModalProps {
  productId: number | null
  productName?: string
  onClose: () => void
}

export default function ProductStockLogModal({
  productId,
  productName,
  onClose
}: ProductStockLogModalProps): JSX.Element {
  const logsQuery = useQuery({
    queryKey: ['product-stock-logs', productId],
    queryFn: () => listProductStockLogs(productId as number),
    enabled: productId !== null
  })

  const logs = logsQuery.data ?? []

  return (
    <Modal
      opened={productId !== null}
      onClose={onClose}
      title={productName ? `Stock history — ${productName}` : 'Stock history'}
      size="lg"
      centered
    >
      {logsQuery.isLoading ? (
        <Center py="xl">
          <Loader />
        </Center>
      ) : logs.length === 0 ? (
        <Center py="lg">
          <Text c="dimmed">No stock movements recorded for this product yet.</Text>
        </Center>
      ) : (
        <StockLogTable logs={logs} showProduct={false} minWidth={480} />
      )}
    </Modal>
  )
}
