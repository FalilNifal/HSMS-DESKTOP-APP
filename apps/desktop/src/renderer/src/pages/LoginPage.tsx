import { useState } from 'react'
import {
  Alert,
  Anchor,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconAlertTriangle } from '@tabler/icons-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Navigate, useNavigate } from 'react-router-dom'
import { getSetupStatus, login, type LoginRequest } from '../api/auth'
import { ApiError } from '../api/client'
import { useAuthStore, useIsAuthenticated } from '../store/authStore'
import BrandMark from '../components/BrandMark'
import RecoverPasswordModal from '../components/RecoverPasswordModal'

export default function LoginPage(): JSX.Element {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const isAuthenticated = useIsAuthenticated()
  const [recoverOpen, setRecoverOpen] = useState(false)

  const statusQuery = useQuery({ queryKey: ['setup-status'], queryFn: getSetupStatus })

  const form = useForm<LoginRequest>({
    initialValues: { username: '', password: '' },
    validate: {
      username: (v) => (v.trim().length === 0 ? 'Username is required' : null),
      password: (v) => (v.length === 0 ? 'Password is required' : null)
    }
  })

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setAuth(data.token, {
        id: data.userId,
        fullName: data.fullName,
        username: data.username,
        role: data.role
      })
      navigate('/', { replace: true })
    }
  })

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (statusQuery.isLoading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    )
  }

  // No admin yet → force the setup wizard first.
  if (statusQuery.data && !statusQuery.data.isSetupCompleted) {
    return <Navigate to="/setup" replace />
  }

  const errorMessage =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? 'Login failed.' : null

  return (
    <Center mih="100vh" p="md">
      <Paper withBorder shadow="md" radius="lg" p="xl" w="100%" maw={400}>
        <Stack gap="sm" align="center" mb="lg">
          <BrandMark size={60} />
          <div style={{ textAlign: 'center' }}>
            <Title order={2}>Janatha Hardware</Title>
            <Text c="dimmed" size="sm">
              Sign in to continue
            </Text>
          </div>
        </Stack>

        {errorMessage && (
          <Alert color="red" icon={<IconAlertTriangle size={18} />} mb="md">
            {errorMessage}
          </Alert>
        )}

        <form onSubmit={form.onSubmit((values) => mutation.mutate(values))}>
          <Stack>
            <TextInput label="Username" withAsterisk data-autofocus {...form.getInputProps('username')} />
            <PasswordInput label="Password" withAsterisk {...form.getInputProps('password')} />
            <Button type="submit" fullWidth mt="sm" size="md" loading={mutation.isPending}>
              Sign in
            </Button>
          </Stack>
        </form>

        <Text ta="center" size="sm" mt="md">
          <Anchor component="button" type="button" onClick={() => setRecoverOpen(true)}>
            Forgot password?
          </Anchor>
        </Text>
      </Paper>

      <RecoverPasswordModal opened={recoverOpen} onClose={() => setRecoverOpen(false)} />
    </Center>
  )
}
