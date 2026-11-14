import { useState } from 'react'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { AppShell } from './components/AppShell'
import { PageTransition } from './components/PageTransition'
import { CreateProjectPage } from './pages/CreateProjectPage'
import { OverviewPage } from './pages/OverviewPage'

export type AppPage = 'overview' | 'create-project'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0879c9', dark: '#0568ad', light: '#eaf5fc' },
    background: { default: '#fbfbfb', paper: '#ffffff' },
    text: { primary: '#171a1e', secondary: '#626972' },
    divider: '#e2e5e9',
  },
  typography: {
    fontFamily: 'Inter, "Segoe UI", Arial, sans-serif',
    button: { fontSize: 14, fontWeight: 500, textTransform: 'none' },
  },
  shape: { borderRadius: 7 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { minHeight: 36, borderRadius: 7 } },
    },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 9 } } },
  },
})

export default function App() {
  const [activePage, setActivePage] = useState<AppPage>('overview')

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppShell activePage={activePage} onNavigate={setActivePage}>
        <PageTransition key={activePage}>
          {activePage === 'overview' ? <OverviewPage /> : <CreateProjectPage />}
        </PageTransition>
      </AppShell>
    </ThemeProvider>
  )
}
