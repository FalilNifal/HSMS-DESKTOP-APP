import React from 'react'
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

import { theme } from './theme'
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

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications position="top-right" />
      <QueryClientProvider client={queryClient}>
        {/* HashRouter is used so routing works from file:// in the packaged app. */}
        <HashRouter>
          <App />
        </HashRouter>
      </QueryClientProvider>
    </MantineProvider>
  </React.StrictMode>
)
