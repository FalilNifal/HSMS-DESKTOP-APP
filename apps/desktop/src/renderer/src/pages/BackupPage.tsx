import { useState } from 'react'
import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Center,
  FileInput,
  Group,
  Loader,
  Modal,
  Stack,
  Table,
  Text,
  Title,
  Tooltip
} from '@mantine/core'
import {
  IconAlertTriangle,
  IconDatabaseExport,
  IconDownload,
  IconInfoCircle,
  IconRestore,
  IconUpload
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import {
  createBackup,
  downloadBackup,
  listBackups,
  restoreBackup,
  restoreFromFile,
  type BackupFile
} from '../api/backup'
import { formatBytes, formatDateTime } from '../lib/format'

export default function BackupPage(): JSX.Element {
  const queryClient = useQueryClient()
  const backupsQuery = useQuery({ queryKey: ['backups'], queryFn: listBackups })
  const [restoreTarget, setRestoreTarget] = useState<BackupFile | null>(null)
  const [fileModalOpen, setFileModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const createMutation = useMutation({
    mutationFn: createBackup,
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['backups'] })
      notifications.show({ color: 'teal', message: `Backup created: ${data.fileName}` })
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not create backup.'
      })
    }
  })

  const restoreMutation = useMutation({
    mutationFn: (fileName: string) => restoreBackup(fileName),
    onSuccess: async (data) => {
      setRestoreTarget(null)
      await queryClient.invalidateQueries()
      notifications.show({
        color: 'teal',
        autoClose: 8000,
        title: 'Backup restored',
        message: `A safety copy of the previous data was saved as ${data.emergencyBackupFileName}. Please sign out and back in to refresh everything.`
      })
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not restore backup.'
      })
    }
  })

  const restoreFileMutation = useMutation({
    mutationFn: (file: File) => restoreFromFile(file),
    onSuccess: async (data) => {
      setFileModalOpen(false)
      setSelectedFile(null)
      await queryClient.invalidateQueries()
      notifications.show({
        color: 'teal',
        autoClose: 8000,
        title: 'Backup restored',
        message: `A safety copy of the previous data was saved as ${data.emergencyBackupFileName}. Please sign out and back in to refresh everything.`
      })
    },
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not restore the file.'
      })
    }
  })

  const downloadMutation = useMutation({
    mutationFn: (fileName: string) => downloadBackup(fileName),
    onError: (error) => {
      notifications.show({
        color: 'red',
        message: error instanceof ApiError ? error.message : 'Could not download backup.'
      })
    }
  })

  const backups = backupsQuery.data ?? []

  return (
    <Stack>
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Backup &amp; Restore</Title>
          <Text c="dimmed">Protect your shop data with manual backups</Text>
        </div>
        <Group gap="sm">
          <Button
            variant="default"
            leftSection={<IconUpload size={18} />}
            onClick={() => setFileModalOpen(true)}
          >
            Restore from file
          </Button>
          <Button
            leftSection={<IconDatabaseExport size={18} />}
            loading={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Create backup
          </Button>
        </Group>
      </Group>

      <Alert color="blue" icon={<IconInfoCircle size={18} />}>
        Backups are stored on this computer. For extra safety, download important backups and keep a
        copy on a USB drive or cloud storage. <b>Moving to a new computer?</b> Bring a backup file over
        and use <b>Restore from file</b> to bring across all your data — products, sales, everything.
      </Alert>

      {backupsQuery.isError && (
        <Alert color="red" icon={<IconAlertTriangle size={18} />}>
          Failed to load backups.
        </Alert>
      )}

      <Card withBorder padding={0} radius="md">
        {backupsQuery.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : backups.length === 0 ? (
          <Center py={48}>
            <Text c="dimmed">No backups yet. Create your first backup above.</Text>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={560}>
            <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>File</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th ta="right">Size</Table.Th>
                  <Table.Th ta="right">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {backups.map((backup) => (
                  <Table.Tr key={backup.fileName}>
                    <Table.Td>
                      <Text size="sm">{backup.fileName}</Text>
                    </Table.Td>
                    <Table.Td>{formatDateTime(backup.createdAt)}</Table.Td>
                    <Table.Td ta="right">{formatBytes(backup.sizeBytes)}</Table.Td>
                    <Table.Td>
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <Tooltip label="Download">
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            loading={downloadMutation.isPending && downloadMutation.variables === backup.fileName}
                            onClick={() => downloadMutation.mutate(backup.fileName)}
                          >
                            <IconDownload size={18} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Restore">
                          <ActionIcon variant="subtle" color="orange" onClick={() => setRestoreTarget(backup)}>
                            <IconRestore size={18} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>

      <Modal
        opened={restoreTarget !== null}
        onClose={() => setRestoreTarget(null)}
        title="Restore backup"
        centered
      >
        <Stack>
          <Alert color="orange" icon={<IconAlertTriangle size={18} />}>
            This will <b>replace all current data</b> with the contents of{' '}
            <b>{restoreTarget?.fileName}</b>. A safety copy of the current data is taken first.
          </Alert>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRestoreTarget(null)}>
              Cancel
            </Button>
            <Button
              color="orange"
              loading={restoreMutation.isPending}
              onClick={() => restoreTarget && restoreMutation.mutate(restoreTarget.fileName)}
            >
              Restore
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={fileModalOpen}
        onClose={() => {
          setFileModalOpen(false)
          setSelectedFile(null)
        }}
        title="Restore from a backup file"
        centered
      >
        <Stack>
          <Alert color="orange" icon={<IconAlertTriangle size={18} />}>
            Choose a backup <b>.zip</b> file (for example from a USB drive). This will{' '}
            <b>replace all current data</b> on this computer. A safety copy of the current data is
            taken first.
          </Alert>
          <FileInput
            label="Backup file"
            placeholder="Choose a .zip backup file"
            accept=".zip,application/zip"
            leftSection={<IconUpload size={18} />}
            value={selectedFile}
            onChange={setSelectedFile}
          />
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setFileModalOpen(false)
                setSelectedFile(null)
              }}
            >
              Cancel
            </Button>
            <Button
              color="orange"
              disabled={!selectedFile}
              loading={restoreFileMutation.isPending}
              onClick={() => selectedFile && restoreFileMutation.mutate(selectedFile)}
            >
              Restore
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
