import { useState } from 'react'
import { Box, IconButton, Popover, Tooltip, Typography } from '@mui/material'
import {
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
  ClockIcon,
  ComputerDesktopIcon,
  LanguageIcon,
  UserIcon,
} from '@heroicons/react/24/outline'

export function AccountMenu({ email }: { email: string }) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  const open = Boolean(anchorEl)

  return (
    <>
      <Tooltip title="Researcher account">
        <IconButton
          className="topbar-icon-button account-menu-trigger"
          aria-label="Researcher account"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? 'account-menu' : undefined}
          onClick={(event) => setAnchorEl(open ? null : event.currentTarget)}
          size="small"
        >
          <UserIcon width={17} height={17} />
        </IconButton>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        marginThreshold={12}
        slotProps={{ paper: {
          id: 'account-menu',
          className: 'account-menu-paper',
          role: 'dialog',
          tabIndex: -1,
          'aria-label': 'Researcher account menu',
        } }}
      >
        <Box className="account-menu">
          <Box className="account-menu-identity">
            <Typography component="div" className="account-menu-title">Researcher account</Typography>
            <Typography component="div" className="account-menu-email">{email}</Typography>
          </Box>
          <Box className="account-menu-divider" />
          <Box className="account-menu-spacer" aria-hidden="true" />
          <Box component="ul" className="account-menu-list" aria-label="Account options">
            <li className="account-menu-item">
              <UserIcon aria-hidden="true" />
              <span>Profile</span>
            </li>
            <li className="account-menu-item">
              <ComputerDesktopIcon aria-hidden="true" />
              <span>Appearance</span>
              <ChevronRightIcon className="account-menu-chevron" aria-hidden="true" />
            </li>
            <li className="account-menu-item">
              <LanguageIcon aria-hidden="true" />
              <span>Language</span>
              <ChevronRightIcon className="account-menu-chevron" aria-hidden="true" />
            </li>
            <li className="account-menu-item">
              <ClockIcon aria-hidden="true" />
              <span>Timezone</span>
              <ChevronRightIcon className="account-menu-chevron" aria-hidden="true" />
            </li>
          </Box>
          <Box className="account-menu-spacer account-menu-spacer-small" aria-hidden="true" />
          <Box className="account-menu-divider" />
          <Box className="account-menu-spacer account-menu-spacer-small" aria-hidden="true" />
          <Box className="account-menu-item account-menu-logout">
            <ArrowRightOnRectangleIcon aria-hidden="true" />
            <span>Log out</span>
          </Box>
        </Box>
      </Popover>
    </>
  )
}
