import type { ReactNode } from 'react'
import { Box, IconButton, InputBase, Tooltip } from '@mui/material'
import { BellIcon, MagnifyingGlassIcon, UserIcon } from '@heroicons/react/24/outline'
import type { AppPage } from '../App'
import type { LocalProject, ProjectTab } from '../types/project'
import { Sidebar } from './Sidebar'

type AppShellProps = {
  activePage: AppPage
  activeProject: LocalProject | null
  projectTab: ProjectTab
  onNavigate: (page: AppPage) => void
  onProjectTabChange: (tab: ProjectTab) => void
  children: ReactNode
}

export function AppShell({ activePage, activeProject, projectTab, onNavigate, onProjectTabChange, children }: AppShellProps) {
  return (
    <Box className="app-shell">
      <Sidebar
        activePage={activePage}
        activeProject={activeProject}
        projectTab={projectTab}
        onNavigate={onNavigate}
        onProjectTabChange={onProjectTabChange}
      />
      <Box component="main" className="main-shell">
        <Box component="header" className="topbar">
          <Box className="topbar-spacer" />
          <Box className="topbar-actions">
            <Box className="global-search">
              <MagnifyingGlassIcon aria-hidden="true" width={16} height={16} />
              <InputBase
                inputProps={{ 'aria-label': 'Search everything' }}
                placeholder="Search everything..."
              />
            </Box>
            <Tooltip title="Notifications">
              <IconButton className="topbar-icon-button" aria-label="Notifications" size="small">
                <BellIcon width={19} height={19} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Researcher account">
              <IconButton className="topbar-icon-button" aria-label="Researcher account" size="small">
                <UserIcon width={17} height={17} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Box className="topbar-divider" />
        <Box className="page-stage">{children}</Box>
      </Box>
    </Box>
  )
}
