import { useState } from 'react'
import {
  Box,
  ButtonBase,
  IconButton,
  InputBase,
  Typography,
} from '@mui/material'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  EllipsisHorizontalIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline'
import type { AppPage } from '../App'
import type { LocalProject, ProjectTab } from '../types/project'

type SidebarProps = {
  activePage: AppPage
  activeProject: LocalProject | null
  projects: LocalProject[]
  projectTab: ProjectTab
  onNavigate: (page: AppPage) => void
  onProjectOpen: (project: LocalProject, tab: ProjectTab) => void
}

const projectSections: { label: string; value: ProjectTab }[] = [
  { label: 'Overview', value: 'overview' },
  { label: 'News Feed', value: 'news-feed' },
  { label: 'Keywords & Monitoring', value: 'keywords-monitoring' },
  { label: 'Members', value: 'members' },
]

export function Sidebar({ activePage, activeProject, projects, projectTab, onNavigate, onProjectOpen }: SidebarProps) {
  const [projectOpen, setProjectOpen] = useState(() => !window.matchMedia('(max-width: 620px)').matches)
  const projectPageActive = activePage === 'project-detail'

  return (
    <Box component="aside" className="sidebar">
      <Box className="sidebar-brand">
        <Box className="sidebar-brand-mark" aria-hidden="true">S</Box>
        <Box className="sidebar-brand-copy">
          <Typography component="div" className="sidebar-brand-name">SJS</Typography>
          <Typography component="div" className="sidebar-brand-description">Scientific Journal System</Typography>
        </Box>
      </Box>

      <Box className="sidebar-search">
        <MagnifyingGlassIcon aria-hidden="true" width={16} height={16} />
        <InputBase
          inputProps={{ 'aria-label': 'Quick search navigation' }}
          placeholder="Quick search..."
        />
      </Box>

      <Box component="nav" className="sidebar-nav" aria-label="Main navigation">
        <Typography component="h2" className="nav-section-label">WORKSPACE</Typography>
        <ButtonBase
          className={`nav-item${activePage === 'overview' ? ' is-active' : ''}`}
          onClick={() => onNavigate('overview')}
          aria-current={activePage === 'overview' ? 'page' : undefined}
          aria-label="Dashboard"
        >
          <Squares2X2Icon className="nav-icon" aria-hidden="true" />
          <span>Dashboard</span>
        </ButtonBase>

        <Box className="nav-group-wrap">
          <ButtonBase
            className={`nav-item nav-group-toggle${activePage === 'create-project' || projectPageActive ? ' has-active-child' : ''}`}
            onClick={() => setProjectOpen((open) => !open)}
            aria-expanded={projectOpen}
            aria-controls="project-navigation"
            aria-label="Projects"
          >
            <FolderIcon className="nav-icon" aria-hidden="true" />
            <span>Projects</span>
            <span className="nav-spacer" />
            {projectOpen ? <ChevronDownIcon className="nav-chevron" aria-hidden="true" /> : <ChevronRightIcon className="nav-chevron" aria-hidden="true" />}
          </ButtonBase>

          {projectOpen && <Box id="project-navigation" className="nested-nav">
            <ButtonBase
              className={`nested-nav-link${activePage === 'create-project' ? ' is-active' : ''}`}
              onClick={() => {
                onNavigate('create-project')
                if (window.matchMedia('(max-width: 620px)').matches) setProjectOpen(false)
              }}
              aria-current={activePage === 'create-project' ? 'page' : undefined}
            >
              Create Project
            </ButtonBase>

            {projects.map((project) => <Box key={project.id}>
              <ButtonBase
                className={`nested-nav-link nested-nav-project${activeProject?.id === project.id && projectPageActive ? ' is-active' : ''}`}
                onClick={() => onProjectOpen(project, 'overview')}
                aria-current={activeProject?.id === project.id && projectPageActive && projectTab === 'overview' ? 'page' : undefined}
                title={project.name}
              >
                <span>{project.name}</span>
              </ButtonBase>
              {activeProject?.id === project.id && projectPageActive && <Box className="project-detail-nav" aria-label={`${project.name} sections`}>
                {projectSections.map((section) => <ButtonBase
                  key={section.value}
                  className={`project-detail-link${projectTab === section.value ? ' is-active' : ''}`}
                  onClick={() => onProjectOpen(project, section.value)}
                  aria-current={projectTab === section.value ? 'page' : undefined}
                >
                  {section.label}
                </ButtonBase>)}
              </Box>}
            </Box>)}
          </Box>}
        </Box>
      </Box>

      <Box className="sidebar-footer">
        <Box className="account-avatar">R</Box>
        <Box className="account-copy">
          <Typography component="div" className="account-name">Researcher</Typography>
          <Typography component="div" className="account-description">My workspace</Typography>
        </Box>
        <IconButton aria-label="Workspace options" size="small" className="workspace-options">
          <EllipsisHorizontalIcon width={17} height={17} />
        </IconButton>
      </Box>
    </Box>
  )
}
