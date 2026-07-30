import React, { useMemo } from 'react'
import ReactDOM from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter } from 'react-router-dom'

import '@fontsource-variable/inter'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import './styles/app.css'
import './styles/print.css'

import { buildTheme } from './theme'
import { useSettingsStore } from './store/settingsStore'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000
    }
  }
})

/** Root wrapper so the Mantine theme can adopt the shop's logo-derived accent live. */
function Root(): JSX.Element {
  const accentColor = useSettingsStore((s) => s.accentColor)
  const activeTheme = useMemo(() => buildTheme(accentColor), [accentColor])
  return (
    <MantineProvider theme={activeTheme} defaultColorScheme="auto">
      <Notifications position="top-right" />
      <QueryClientProvider client={queryClient}>
        {/* HashRouter is used so routing works from file:// in the packaged app. */}
        <HashRouter>
          <App />
        </HashRouter>
      </QueryClientProvider>
    </MantineProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)
