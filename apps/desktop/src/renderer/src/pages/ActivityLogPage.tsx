import { useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  TextInput,
  Title
} from '@mantine/core'
import { IconAlertTriangle, IconDownload, IconLogin2, IconLogout, IconSearch } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import { getActivity, type ActivityEvent } from '../api/activity'
import { formatDateTime } from '../lib/format'
import { downloadCsv } from '../lib/csv'
import type { UserRole } from '../store/authStore'

function toDateInput(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const now = new Date()
const DEFAULT_FROM = toDateInput(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7))
const DEFAULT_TO = toDateInput(now)

const ROLE_COLORS: Record<string, string> = {
  Admin: 'grape',
  Manager: 'blue',
  Cashier: 'teal'
}

export default function ActivityLogPage(): JSX.Element {
  const [fromDate, setFromDate] = useState(DEFAULT_FROM)
  const [toDate, setToDate] = useState(DEFAULT_TO)
  const [search, setSearch] = useState('')

  const activityQuery = useQuery({
    queryKey: ['activity', fromDate, toDate],
    queryFn: () => getActivity(fromDate, toDate)
  })

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (activityQuery.data ?? []).filter((e) =>
      term.length === 0
        ? true
        : e.fullName.toLowerCase().includes(term) ||
          e.username.toLowerCase().includes(term) ||
          e.event.toLowerCase().includes(term)
    )
  }, [activityQuery.data, search])

  return (
    <Stack className="hsms-animate-in">
      <div>
        <Title order={2}>User Activity</Title>
        <Text c="dimmed">Login and logout history for staff accounts</Text>
      </div>

      <Card withBorder radius="md" padding="sm">
        <Group align="flex-end" gap="md">
          <TextInput
            type="date"
            label="From"
            value={fromDate}
            onChange={(e) => setFromDate(e.currentTarget.value)}
          />
          <TextInput
            type="date"
            label="To"
            value={toDate}
            onChange={(e) => setToDate(e.currentTarget.value)}
          />
          <TextInput
            label="Search"
            placeholder="Name, username or event…"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
          <Button
            variant="light"
            leftSection={<IconDownload size={16} />}
            disabled={!filtered.length}
            onClick={() =>
              downloadCsv(
                `activity_${fromDate}_${toDate}.csv`,
                ['When', 'User', 'Username', 'Role', 'Event'],
                filtered.map((e) => [formatDateTime(e.createdAt), e.fullName, e.username, e.role, e.event])
              )
            }
          >
            Export CSV
          </Button>
        </Group>
      </Card>

      {activityQuery.isError && (
        <Alert color="red" icon={<IconAlertTriangle size={18} />}>
          {activityQuery.error instanceof ApiError ? activityQuery.error.message : 'Failed to load activity.'}
        </Alert>
      )}

      <Card withBorder padding={0} radius="md">
        {activityQuery.isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : filtered.length === 0 ? (
          <Center py={48}>
            <Text c="dimmed">No activity in this period.</Text>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={640}>
            <Table highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>When</Table.Th>
                  <Table.Th>User</Table.Th>
                  <Table.Th>Role</Table.Th>
                  <Table.Th>Event</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>
    </Stack>
  )
}

function EventRow({ event }: { event: ActivityEvent }): JSX.Element {
  const isLogin = event.event === 'Login'
  return (
    <Table.Tr>
      <Table.Td>{formatDateTime(event.createdAt)}</Table.Td>
      <Table.Td>
        <Text fw={500}>{event.fullName}</Text>
        <Text size="xs" c="dimmed">
          {event.username}
        </Text>
      </Table.Td>
      <Table.Td>
        <Badge variant="light" color={ROLE_COLORS[event.role as UserRole] ?? 'gray'}>
          {event.role}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Badge
          variant="light"
          color={isLogin ? 'green' : 'gray'}
          leftSection={isLogin ? <IconLogin2 size={12} /> : <IconLogout size={12} />}
        >
          {event.event}
        </Badge>
      </Table.Td>
    </Table.Tr>
  )
}
