import { useState } from 'react'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { AppShell } from './components/AppShell'
import { PageTransition } from './components/PageTransition'
import { CreateProjectPage } from './pages/CreateProjectPage'
import { OverviewPage } from './pages/OverviewPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import type { LocalProject, ProjectTab } from './types/project'

export type AppPage = 'overview' | 'create-project' | 'project-detail'

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
  const [activeProject, setActiveProject] = useState<LocalProject | null>(null)
  const [projectTab, setProjectTab] = useState<ProjectTab>('overview')

  const handleProjectCreate = (project: LocalProject) => {
    setActiveProject(project)
    setProjectTab('overview')
    setActivePage('project-detail')
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppShell
        activePage={activePage}
        activeProject={activeProject}
        projectTab={projectTab}
        onNavigate={setActivePage}
        onProjectTabChange={setProjectTab}
      >
        <PageTransition key={`${activePage}-${activeProject?.id ?? ''}`}>
          {activePage === 'overview'
            ? <OverviewPage />
            : activePage === 'create-project'
              ? <CreateProjectPage onProjectCreate={handleProjectCreate} />
              : activeProject
                ? <ProjectDetailPage project={activeProject} activeTab={projectTab} onTabChange={setProjectTab} />
                : <OverviewPage />}
        </PageTransition>
      </AppShell>
    </ThemeProvider>
  )
}
