import { useCallback, useEffect, useRef, useState } from 'react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { onAuthStateChanged } from 'firebase/auth'
import { AppShell } from './components/AppShell'
import { PageTransition } from './components/PageTransition'
import { ResearchPulseDesignSystem } from './design-system/ResearchPulseDesignSystem'
import { CreateProjectPage } from './pages/CreateProjectPage'
import { OverviewPage } from './pages/OverviewPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import type { LocalProject, ProjectTab } from './types/project'
import { auth, ensureDevelopmentEmulatorUser, firebaseConfigured, firebaseEmulatorsEnabled } from './services/firebase'
import { createProjectInFirestore, listMyProjects, type NewProject } from './services/projectStore'
import { researchPulseTheme } from './theme'

export type AppPage = 'overview' | 'create-project' | 'project-detail'

export default function App() {
  if (window.location.pathname.replace(/\/$/, '') === '/design-system') {
    return (
      <ThemeProvider theme={researchPulseTheme}>
        <CssBaseline />
        <ResearchPulseDesignSystem />
      </ThemeProvider>
    )
  }

  return <ResearchPulseApp />
}

function ResearchPulseApp() {
  const [activePage, setActivePage] = useState<AppPage>('overview')
  const [activeProject, setActiveProject] = useState<LocalProject | null>(null)
  const [projects, setProjects] = useState<LocalProject[]>([])
  const [projectTab, setProjectTab] = useState<ProjectTab>('overview')
  const [userId, setUserId] = useState<string | null>(null)
  const [authStatus, setAuthStatus] = useState<'loading' | 'ready' | 'error'>(() => firebaseConfigured ? 'loading' : 'error')
  const [authError, setAuthError] = useState(() => firebaseConfigured ? '' : 'Firebase is not configured. Set the Firebase web app variables in .env.local.')
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsError, setProjectsError] = useState('')
  const projectRequestVersion = useRef(0)

  const loadProjects = useCallback(async () => {
    const requestVersion = ++projectRequestVersion.current
    if (!auth.currentUser) {
      setProjects([])
      setProjectsLoading(false)
      setProjectsError('')
      return
    }

    setProjectsLoading(true)
    setProjectsError('')
    try {
      const savedProjects = await listMyProjects()
      if (projectRequestVersion.current === requestVersion) setProjects(savedProjects)
    } catch (error) {
      if (projectRequestVersion.current === requestVersion) {
        setProjectsError(error instanceof Error ? error.message : 'Could not load saved projects.')
      }
    } finally {
      if (projectRequestVersion.current === requestVersion) setProjectsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!firebaseConfigured) return

    let mounted = true
    let unsubscribe: (() => void) | null = null

    const subscribeToAuthChanges = () => {
      unsubscribe = onAuthStateChanged(auth, (user) => {
        if (!mounted) return
        setUserId(user?.uid ?? null)
        setAuthError('')

        if (user) {
          setAuthStatus('ready')
          void loadProjects()
          return
        }

        void loadProjects()
        if (firebaseEmulatorsEnabled) {
          setAuthStatus('loading')
          void ensureDevelopmentEmulatorUser().catch((error: unknown) => {
            if (!mounted) return
            setAuthStatus('error')
            setAuthError(error instanceof Error ? error.message : 'Could not sign in to the Firebase Auth Emulator.')
          })
        } else {
          setAuthStatus('ready')
        }
      }, (error) => {
        if (!mounted) return
        setAuthStatus('error')
        setAuthError(error.message || 'Could not read Firebase authentication state.')
      })
    }

    if (firebaseEmulatorsEnabled) {
      void ensureDevelopmentEmulatorUser().then(() => {
        if (mounted) subscribeToAuthChanges()
      }).catch((error: unknown) => {
        if (!mounted) return
        setAuthStatus('error')
        setAuthError(error instanceof Error ? error.message : 'Could not sign in to the Firebase Auth Emulator.')
      })
    } else {
      subscribeToAuthChanges()
    }

    return () => {
      mounted = false
      unsubscribe?.()
    }
  }, [loadProjects])

  const handleProjectCreate = async (projectDraft: NewProject) => {
    const project = await createProjectInFirestore(projectDraft)
    setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)])
    setActiveProject(project)
    setProjectTab('overview')
    setActivePage('project-detail')
    return project
  }

  const handleProjectOpen = (project: LocalProject, tab: ProjectTab = 'overview') => {
    setActiveProject(project)
    setProjectTab(tab)
    setActivePage('project-detail')
  }

  const projectStorageMessage = authStatus === 'loading'
    ? 'Connecting to Firebase...'
    : authError || (userId ? 'Projects save to Firestore.' : 'Sign in to save projects.')

  return (
    <ThemeProvider theme={researchPulseTheme}>
      <CssBaseline />
      <AppShell
        activePage={activePage}
        activeProject={activeProject}
        projects={projects}
        projectTab={projectTab}
        accountEmail={auth.currentUser?.email ?? 'user@example.com'}
        onNavigate={setActivePage}
        onProjectOpen={handleProjectOpen}
      >
        <PageTransition key={`${activePage}-${activeProject?.id ?? ''}`}>
          {activePage === 'overview'
            ? <OverviewPage />
            : activePage === 'create-project'
              ? <CreateProjectPage
                projects={projects}
                projectsLoading={projectsLoading}
                projectsError={projectsError}
                canSaveProjects={authStatus === 'ready' && Boolean(userId)}
                storageMessage={projectStorageMessage}
                onRetryProjects={() => { void loadProjects() }}
                onProjectCreate={handleProjectCreate}
                onProjectOpen={handleProjectOpen}
              />
              : activeProject
                ? <ProjectDetailPage project={activeProject} activeTab={projectTab} onTabChange={setProjectTab} />
                : <OverviewPage />}
        </PageTransition>
      </AppShell>
    </ThemeProvider>
  )
}
