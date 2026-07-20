import { useState } from 'react'
import {
  Alert,
  Button,
  Center,
  Code,
  CopyButton,
  Divider,
  Group,
  Loader,
  Modal,
  Paper,
  PasswordInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconAlertTriangle, IconCheck, IconCopy, IconShieldLock } from '@tabler/icons-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Navigate, useNavigate } from 'react-router-dom'
import { getSetupStatus, initializeSetup, type InitializeSetupRequest } from '../api/auth'
import { ApiError } from '../api/client'
import BrandMark from '../components/BrandMark'

export default function SetupPage(): JSX.Element {
  const navigate = useNavigate()
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null)

  const statusQuery = useQuery({ queryKey: ['setup-status'], queryFn: getSetupStatus })

  const form = useForm<InitializeSetupRequest>({
    initialValues: {
      shopName: '',
      address: '',
      phoneNumber: '',
      currency: 'LKR',
      invoiceFooterMessage: 'Thank you for your business!',
      adminFullName: '',
      adminUsername: '',
      adminPassword: ''
    },
    validate: {
      shopName: (v) => (v.trim().length === 0 ? 'Shop name is required' : null),
      address: (v) => (v.trim().length === 0 ? 'Address is required' : null),
      phoneNumber: (v) => (v.trim().length === 0 ? 'Phone number is required' : null),
      currency: (v) => (v.trim().length === 0 ? 'Currency is required' : null),
      adminFullName: (v) => (v.trim().length === 0 ? 'Full name is required' : null),
      adminUsername: (v) => (v.trim().length < 3 ? 'Username must be at least 3 characters' : null),
      adminPassword: (v) => (v.length < 8 ? 'Password must be at least 8 characters' : null)
    }
  })

  const mutation = useMutation({
    mutationFn: initializeSetup,
    onSuccess: (data) => setRecoveryKey(data.recoveryKey)
  })

  if (statusQuery.isLoading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    )
  }

  // If setup is already done, this page should never show.
  if (statusQuery.data?.isSetupCompleted) {
    return <Navigate to="/login" replace />
  }

  const errorMessage =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? 'Setup failed.' : null

  return (
    <Center mih="100vh" p="md" bg="var(--mantine-color-body)">
      <Paper withBorder shadow="md" radius="lg" p="xl" w="100%" maw={720}>
        <Group gap="sm" mb="md" wrap="nowrap">
          <BrandMark size={48} />
          <div>
            <Title order={2}>Welcome</Title>
            <Text c="dimmed" size="sm">
              First-time setup — create your shop profile and the administrator account.
            </Text>
          </div>
        </Group>

        {errorMessage && (
          <Alert color="red" icon={<IconAlertTriangle size={18} />} mb="md">
            {errorMessage}
          </Alert>
        )}

        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Divider label="Shop details" labelPosition="left" mb="sm" />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TextInput label="Shop name" withAsterisk {...form.getInputProps('shopName')} />
            <TextInput label="Phone number" withAsterisk {...form.getInputProps('phoneNumber')} />
            <TextInput label="Address" withAsterisk {...form.getInputProps('address')} />
            <TextInput label="Currency" withAsterisk placeholder="LKR" {...form.getInputProps('currency')} />
            <TextInput
              label="Invoice footer message"
              {...form.getInputProps('invoiceFooterMessage')}
              style={{ gridColumn: '1 / -1' }}
            />
          </SimpleGrid>

          <Divider label="Administrator account" labelPosition="left" my="md" />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TextInput label="Full name" withAsterisk {...form.getInputProps('adminFullName')} />
            <TextInput label="Username" withAsterisk {...form.getInputProps('adminUsername')} />
            <PasswordInput
              label="Password"
              withAsterisk
              description="At least 8 characters"
              {...form.getInputProps('adminPassword')}
              style={{ gridColumn: '1 / -1' }}
            />
          </SimpleGrid>

          <Button type="submit" fullWidth mt="xl" size="md" loading={mutation.isPending}>
            Complete setup
          </Button>
        </form>
      </Paper>

      <Modal
        opened={recoveryKey !== null}
        onClose={() => {}}
        withCloseButton={false}
        closeOnClickOutside={false}
        closeOnEscape={false}
        centered
        title={
          <Group gap="xs">
            <IconShieldLock size={20} />
            <Text fw={600}>Save your recovery key</Text>
          </Group>
        }
      >
        <Stack>
          <Alert color="yellow" icon={<IconAlertTriangle size={18} />}>
            This key is shown <b>only once</b>. Store it somewhere safe — it is the only way to reset the admin
            password if it is lost.
          </Alert>
          <Center>
            <Code fz="lg" p="sm">
              {recoveryKey}
            </Code>
          </Center>
          <Group justify="space-between">
            <CopyButton value={recoveryKey ?? ''}>
              {({ copied, copy }) => (
                <Button
                  variant="light"
                  color={copied ? 'teal' : 'indigo'}
                  leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  onClick={copy}
                >
                  {copied ? 'Copied' : 'Copy key'}
                </Button>
              )}
            </CopyButton>
            <Button onClick={() => navigate('/login', { replace: true })}>
              I have saved it — continue
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Center>
  )
}
