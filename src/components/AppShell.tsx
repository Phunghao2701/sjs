import type { ReactNode } from 'react'
import { Box, IconButton, InputBase, Tooltip } from '@mui/material'
import { BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import type { AppPage } from '../App'
import { Sidebar } from './Sidebar'
import { AccountMenu } from './AccountMenu'

type AppShellProps = {
  activePage: AppPage
  accountEmail: string
  onNavigate: (page: AppPage) => void
  onLogout: () => void
  children: ReactNode
}

export function AppShell({ activePage, accountEmail, onNavigate, onLogout, children }: AppShellProps) {
  return (
    <Box className="app-shell">
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
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
            <AccountMenu email={accountEmail} onLogout={onLogout} />
          </Box>
        </Box>
        <Box className="topbar-divider" />
        <Box className={`page-stage${activePage === 'project-detail' ? ' is-project-detail' : ''}`}>{children}</Box>
      </Box>
    </Box>
  )
}
