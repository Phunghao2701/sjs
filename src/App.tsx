import { useCallback, useEffect, useRef, useState } from 'react'
import { Box, Button, CssBaseline, ThemeProvider, Typography } from '@mui/material'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { AppShell } from './components/AppShell'
import { PageTransition } from './components/PageTransition'
import { ResearchPulseDesignSystem } from './design-system/ResearchPulseDesignSystem'
import { CreateProjectPage } from './pages/CreateProjectPage'
import { OverviewPage } from './pages/OverviewPage'
import { LoginPage, type SsoLoginStatus } from './pages/LoginPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import type { LocalProject, ProjectTab } from './types/project'
import { auth, ensureDevelopmentEmulatorUser, firebaseConfigured, firebaseEmulatorsEnabled } from './services/firebase'
import { clearKeywordMonitoringCache } from './services/keywordMonitoring'
import { clearWorkerReadCache } from './services/workerApi'
import { createProjectInFirestore, listMyProjects, type NewProject } from './services/projectStore'
import { completeSsoLogin, getSsoConfigurationError, hasSsoCallbackParameters, startSsoLogin } from './services/ssoLogin'
import { researchPulseTheme } from './theme'

export type AppPage = 'overview' | 'create-project' | 'project-detail'

type AppRoute = {
  page: AppPage
  projectId: string | null
  tab: ProjectTab
}

const projectTabValues: ProjectTab[] = ['overview', 'news-feed', 'keywords-monitoring', 'members']

function readAppRoute(): AppRoute {
  const params = new URLSearchParams(window.location.search)
  const page = params.get('page')
  if (page === 'create-project') return { page, projectId: null, tab: 'overview' }

  const projectId = params.get('projectId')
  if (page === 'project-detail' && projectId) {
    const requestedTab = params.get('tab') as ProjectTab | null
    return {
      page,
      projectId,
      tab: requestedTab && projectTabValues.includes(requestedTab) ? requestedTab : 'overview',
    }
  }

  return { page: 'overview', projectId: null, tab: 'overview' }
}

function writeAppRoute(route: AppRoute, replace = false) {
  const url = new URL(window.location.href)
  url.pathname = '/'
  url.search = ''
  if (route.page === 'create-project') {
    url.searchParams.set('page', 'create-project')
  } else if (route.page === 'project-detail' && route.projectId) {
    url.searchParams.set('page', 'project-detail')
    url.searchParams.set('projectId', route.projectId)
    url.searchParams.set('tab', route.tab)
  }

  window.history[replace ? 'replaceState' : 'pushState'](window.history.state, '', `${url.pathname}${url.search}`)
}

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
  const [route, setRoute] = useState<AppRoute>(readAppRoute)
  const [projects, setProjects] = useState<LocalProject[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [authStatus, setAuthStatus] = useState<'loading' | 'ready' | 'error'>(() => firebaseConfigured ? 'loading' : 'error')
  const [authError, setAuthError] = useState(() => firebaseConfigured ? '' : 'Firebase is not configured. Set the Firebase web app variables in .env.local.')
  const [projectsLoading, setProjectsLoading] = useState(() => readAppRoute().page === 'project-detail')
  const [projectsError, setProjectsError] = useState('')
  const projectRequestVersion = useRef(0)
  const skipDevelopmentAutoSignIn = useRef(false)
  const ssoCallbackHandled = useRef(false)
  const [ssoStatus, setSsoStatus] = useState<SsoLoginStatus>('idle')
  const [ssoError, setSsoError] = useState('')
  const developmentAutoLoginEnabled = firebaseEmulatorsEnabled && import.meta.env.VITE_DEV_AUTH_AUTO_LOGIN !== 'false'
  const projectRouteIsMissing = authStatus === 'ready'
    && !projectsLoading
    && !projectsError
    && route.page === 'project-detail'
    && Boolean(route.projectId)
    && !projects.some((project) => project.id === route.projectId)
  const currentRoute = projectRouteIsMissing ? { page: 'overview', projectId: null, tab: 'overview' } as AppRoute : route
  const activePage = currentRoute.page
  const projectTab = currentRoute.tab
  const activeProject = currentRoute.projectId ? projects.find((project) => project.id === currentRoute.projectId) ?? null : null

  const navigate = useCallback((nextRoute: AppRoute, replace = false) => {
    writeAppRoute(nextRoute, replace)
    setRoute(nextRoute)
  }, [])

  useEffect(() => {
    const handlePopState = () => setRoute(readAppRoute())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

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

        clearKeywordMonitoringCache()
        clearWorkerReadCache()
        void loadProjects()
        if (developmentAutoLoginEnabled && !skipDevelopmentAutoSignIn.current) {
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

    if (developmentAutoLoginEnabled) {
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
  }, [developmentAutoLoginEnabled, loadProjects])

  useEffect(() => {
    if (projectRouteIsMissing) writeAppRoute({ page: 'overview', projectId: null, tab: 'overview' }, true)
  }, [projectRouteIsMissing])

  useEffect(() => {
    if (ssoCallbackHandled.current || !hasSsoCallbackParameters()) return
    ssoCallbackHandled.current = true
    setSsoStatus('processing')
    setSsoError('')
    void completeSsoLogin().then(() => {
      setSsoStatus('success')
    }).catch((error: unknown) => {
      setSsoStatus('error')
      setSsoError(error instanceof Error ? error.message : 'HyperDataLab sign-in failed. Please try again.')
    })
  }, [])

  const handleProjectCreate = async (projectDraft: NewProject) => {
    const project = await createProjectInFirestore(projectDraft)
    setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)])
    navigate({ page: 'project-detail', projectId: project.id, tab: 'overview' })
    return project
  }

  const handleProjectOpen = (project: LocalProject, tab: ProjectTab = 'overview') => {
    navigate({ page: 'project-detail', projectId: project.id, tab })
  }

  const handleNavigate = (page: AppPage) => {
    navigate({ page, projectId: null, tab: 'overview' })
  }

  const handleProjectTabChange = (tab: ProjectTab) => {
    if (activeProject) navigate({ page: 'project-detail', projectId: activeProject.id, tab })
  }

  const handleSsoSignIn = async () => {
    setSsoError('')
    setSsoStatus('starting')
    try {
      await startSsoLogin()
    } catch (error) {
      setSsoStatus('error')
      setSsoError(error instanceof Error ? error.message : 'Could not start HyperDataLab sign-in.')
    }
  }

  const handleLogout = async () => {
    if (firebaseEmulatorsEnabled) skipDevelopmentAutoSignIn.current = true
    try {
      await signOut(auth)
      navigate({ page: 'overview', projectId: null, tab: 'overview' }, true)
    } catch (error) {
      skipDevelopmentAutoSignIn.current = false
      setAuthError(error instanceof Error ? error.message : 'Could not sign out.')
    }
  }

  const projectStorageMessage = authStatus === 'loading'
    ? 'Connecting to Firebase...'
    : authError || (userId ? 'Projects save to Firestore.' : 'Sign in to save projects.')

  if (authStatus !== 'ready' || !userId) {
    const ssoConfigurationError = getSsoConfigurationError()
    const loginSetupMessage = !firebaseConfigured
      ? authError || 'Firebase is not configured. Set the Firebase web app variables in .env.local.'
      : ssoConfigurationError
    const loginError = ssoError || (authStatus === 'error' && firebaseConfigured ? authError : '')
    const loginStatus = ssoStatus !== 'idle'
      ? ssoStatus
      : authStatus === 'loading'
        ? 'checking'
        : loginError
          ? 'error'
          : 'idle'

    return (
      <ThemeProvider theme={researchPulseTheme}>
        <CssBaseline />
        <LoginPage
          status={loginStatus}
          error={loginError}
          setupMessage={loginSetupMessage}
          canSignIn={firebaseConfigured && !ssoConfigurationError}
          onSignIn={() => { void handleSsoSignIn() }}
        />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={researchPulseTheme}>
      <CssBaseline />
      <AppShell
        activePage={activePage}
        activeProject={activeProject}
        projects={projects}
        projectTab={projectTab}
        accountEmail={auth.currentUser?.email ?? 'user@example.com'}
        onNavigate={handleNavigate}
        onProjectOpen={handleProjectOpen}
        onLogout={() => { void handleLogout() }}
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
                ? <ProjectDetailPage project={activeProject} activeTab={projectTab} onTabChange={handleProjectTabChange} />
                : activePage === 'project-detail'
                  ? <Box className="project-overview-error" role={projectsError ? 'alert' : 'status'}>
                    <Typography>{projectsError ? 'Could not load this project.' : projectsLoading ? 'Loading project...' : 'Project not found.'}</Typography>
                    {projectsError && <Button size="small" variant="outlined" onClick={() => { void loadProjects() }}>Retry</Button>}
                  </Box>
                  : <OverviewPage />}
        </PageTransition>
      </AppShell>
    </ThemeProvider>
  )
}
