import type { ReactNode } from 'react'
import { Box, IconButton, InputBase, Tooltip } from '@mui/material'
import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import type { AppPage } from '../App'
import type { LocalProject, ProjectTab } from '../types/project'
import { Sidebar } from './Sidebar'
import { AccountMenu } from './AccountMenu'

type AppShellProps = {
  activePage: AppPage
  activeProject: LocalProject | null
  projects: LocalProject[]
  projectsLoading: boolean
  projectTab: ProjectTab
  accountEmail: string
  onProfileClick: () => void
  onNavigate: (page: AppPage) => void
  onProjectOpen: (project: LocalProject, tab: ProjectTab) => void
  onLogout: () => void
  children: ReactNode
}

export function AppShell({ activePage, activeProject, projects, projectsLoading, projectTab, accountEmail, onProfileClick, onNavigate, onProjectOpen, onLogout, children }: AppShellProps) {
  return (
    <Box className="app-shell">
      <Sidebar
        activePage={activePage}
        activeProject={activeProject}
        projects={projects}
        projectsLoading={projectsLoading}
        projectTab={projectTab}
        onNavigate={onNavigate}
        onProjectOpen={onProjectOpen}
      />
      <Box component="main" className="main-shell">
        <Box component="header" className={`topbar${activePage === 'profile' ? ' is-profile-topbar' : ''}`}>
          {activePage === 'profile'
            ? <Box className="profile-topbar-breadcrumb" aria-label="Breadcrumb">
              <span>Account</span><span aria-hidden="true">/</span><strong>Profile</strong>
            </Box>
            : <Box className="topbar-spacer" />}
          <Box className="topbar-actions">
            {activePage !== 'profile' && <Box className="global-search">
              <MagnifyingGlassIcon aria-hidden="true" width={16} height={16} />
              <InputBase inputProps={{ 'aria-label': 'Search everything' }} placeholder="Search everything..." />
            </Box>}
            <Tooltip title="Notifications">
              <IconButton className="topbar-icon-button" aria-label="Notifications" size="small">
                <BellIcon width={19} height={19} />
              </IconButton>
            </Tooltip>
            <AccountMenu email={accountEmail} onProfileClick={onProfileClick} onLogout={onLogout} />
          </Box>
        </Box>
        <Box className="topbar-divider" />
        <Box className={`page-stage${activePage === 'project-detail' ? ' is-project-detail' : ''}`}>{children}</Box>
      </Box>
    </Box>
  )
}
