import { useState } from 'react'
import {
  Alert,
  Button,
  Divider,
  FileInput,
  Group,
  List,
  Modal,
  ScrollArea,
  Stack,
  Table,
  Text
} from '@mantine/core'
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconDownload,
  IconFileSpreadsheet,
  IconUpload
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../api/client'
import { importProducts, type ImportProductRow, type ImportResult } from '../../api/products'
import { downloadCsv, parseCsv } from '../../lib/csv'

interface ImportProductsModalProps {
  opened: boolean
  onClose: () => void
}

const TEMPLATE_HEADERS = [
  'Name',
  'SKU',
  'Category',
  'Supplier',
  'PurchasePrice',
  'MinimumSellingPrice',
  'StockQuantity',
  'LowStockLevel'
]

const normalize = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, '')

export default function ImportProductsModal({ opened, onClose }: ImportProductsModalProps): JSX.Element {
  const queryClient = useQueryClient()
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<ImportProductRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  const reset = (): void => {
    setFileName(null)
    setRows([])
    setParseError(null)
    setResult(null)
  }

  const handleClose = (): void => {
    reset()
    onClose()
  }

  const downloadTemplate = (): void => {
    downloadCsv('product-import-template.csv', TEMPLATE_HEADERS, [
      ['Claw Hammer 16oz', 'HT-HAM-16', 'Hand Tools', 'Lanka Tools', 950, 1250, 40, 8],
      ['Cordless Drill 18V', 'PT-DRL-18', 'Power Tools', 'Lanka Tools', 11800, 15500, 10, 3]
    ])
  }

  const handleFile = async (file: File | null): Promise<void> => {
    setResult(null)
    setParseError(null)
    setRows([])
    setFileName(file?.name ?? null)
    if (!file) return

    try {
      const parsed = parseCsv(await file.text())
      if (parsed.length < 2) {
        setParseError('The file has headers but no data rows.')
        return
      }

      const headers = parsed[0].map(normalize)
      const idx = (key: string): number => headers.indexOf(key)
      const nameI = idx('name')
      const skuI = idx('sku')
      const catI = idx('category')
      const supI = idx('supplier')
      const purI = idx('purchaseprice')
      const minI = idx('minimumsellingprice')
      const stkI = idx('stockquantity')
      const lowI = idx('lowstocklevel')

      const missing: string[] = []
      if (nameI < 0) missing.push('Name')
      if (skuI < 0) missing.push('SKU')
      if (catI < 0) missing.push('Category')
      if (purI < 0) missing.push('PurchasePrice')
      if (minI < 0) missing.push('MinimumSellingPrice')
      if (stkI < 0) missing.push('StockQuantity')
      if (missing.length > 0) {
        setParseError(`Missing columns: ${missing.join(', ')}. Please use the template.`)
        return
      }

      const num = (value: string | undefined): number => {
        const n = Number((value ?? '').trim())
        return Number.isFinite(n) ? n : 0
      }

      const built = parsed
        .slice(1)
        .map<ImportProductRow>((r) => ({
          name: (r[nameI] ?? '').trim(),
          sku: (r[skuI] ?? '').trim(),
          categoryName: (r[catI] ?? '').trim(),
          supplierName: supI >= 0 ? (r[supI] ?? '').trim() : '',
          purchasePrice: num(r[purI]),
          minimumSellingPrice: num(r[minI]),
          stockQuantity: Math.trunc(num(r[stkI])),
          lowStockLevel: lowI >= 0 ? Math.trunc(num(r[lowI])) : 0
        }))
        .filter((row) => row.name.length > 0 || row.sku.length > 0)

      if (built.length === 0) {
        setParseError('No product rows were found in the file.')
        return
      }
      setRows(built)
    } catch {
      setParseError('Could not read the file. Make sure it is a valid CSV.')
    }
  }

  const mutation = useMutation({
    mutationFn: () => importProducts(rows),
    onSuccess: async (res) => {
      setResult(res)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
        queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      ])
      notifications.show({ color: 'teal', message: `Imported ${res.createdCount} products.` })
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Import failed.'
      })
    }
  })

  return (
    <Modal opened={opened} onClose={handleClose} title="Import products from CSV" size="lg" centered>
      <Stack>
        {result ? (
          <>
            <Alert color="teal" icon={<IconCircleCheck size={18} />} title="Import complete">
              <Text>
                Created <b>{result.createdCount}</b> product{result.createdCount === 1 ? '' : 's'}.
                {result.skippedCount > 0 && (
                  <>
                    {' '}
                    Skipped <b>{result.skippedCount}</b> duplicate SKU
                    {result.skippedCount === 1 ? '' : 's'}.
                  </>
                )}
              </Text>
            </Alert>
            {result.errors.length > 0 && (
              <Alert color="orange" icon={<IconAlertTriangle size={18} />} title={`${result.errors.length} row(s) had problems`}>
                <ScrollArea.Autosize mah={180}>
                  <List size="sm" spacing={4}>
                    {result.errors.map((e) => (
                      <List.Item key={`${e.rowNumber}-${e.sku}`}>
                        Row {e.rowNumber} {e.sku ? `(${e.sku})` : ''}: {e.message}
                      </List.Item>
                    ))}
                  </List>
                </ScrollArea.Autosize>
              </Alert>
            )}
            <Group justify="flex-end">
              <Button variant="default" onClick={reset}>
                Import another file
              </Button>
              <Button onClick={handleClose}>Done</Button>
            </Group>
          </>
        ) : (
          <>
            <Text size="sm" c="dimmed">
              Prepare your products in a spreadsheet and save as CSV. New categories and suppliers are
              created automatically; rows with a SKU that already exists are skipped.
            </Text>

            <Button
              variant="light"
              leftSection={<IconDownload size={16} />}
              onClick={downloadTemplate}
              w="fit-content"
            >
              Download template
            </Button>

            <Divider />

            <FileInput
              label="CSV file"
              placeholder="Choose a .csv file"
              accept=".csv,text/csv"
              leftSection={<IconFileSpreadsheet size={18} />}
              value={null}
              onChange={(file) => void handleFile(file)}
            />
            {fileName && !parseError && rows.length > 0 && (
              <Text size="sm">
                <b>{fileName}</b> — {rows.length} product{rows.length === 1 ? '' : 's'} ready to import.
              </Text>
            )}

            {parseError && (
              <Alert color="red" icon={<IconAlertTriangle size={18} />}>
                {parseError}
              </Alert>
            )}

            {rows.length > 0 && (
              <ScrollArea.Autosize mah={220}>
                <Table stickyHeader withRowBorders={false} verticalSpacing={4}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Name</Table.Th>
                      <Table.Th>SKU</Table.Th>
                      <Table.Th>Category</Table.Th>
                      <Table.Th ta="right">Min. price</Table.Th>
                      <Table.Th ta="right">Stock</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {rows.slice(0, 8).map((row, i) => (
                      <Table.Tr key={`${row.sku}-${i}`}>
                        <Table.Td>{row.name}</Table.Td>
                        <Table.Td>{row.sku}</Table.Td>
                        <Table.Td>{row.categoryName}</Table.Td>
                        <Table.Td ta="right">{row.minimumSellingPrice}</Table.Td>
                        <Table.Td ta="right">{row.stockQuantity}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
                {rows.length > 8 && (
                  <Text size="xs" c="dimmed" ta="center" mt={4}>
                    …and {rows.length - 8} more
                  </Text>
                )}
              </ScrollArea.Autosize>
            )}

            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                leftSection={<IconUpload size={16} />}
                disabled={rows.length === 0}
                loading={mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                Import {rows.length > 0 ? `${rows.length} product${rows.length === 1 ? '' : 's'}` : ''}
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  )
}
