import { useMemo, useState } from 'react'
import { Box, Button, InputBase, MenuItem, Paper, Select, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material'
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline'
import type { LocalProject, ProjectStatus } from '../types/project'
import { ProjectInlineSkeleton } from '../components/ProjectLoadingSkeletons'

type ProjectStatusFilter = 'all' | ProjectStatus
type ProjectSort = 'recent' | 'oldest' | 'name'

type AllProjectsPageProps = {
  projects: LocalProject[]
  projectsLoading: boolean
  projectsError: string
  onRetryProjects: () => void
  onProjectOpen: (project: LocalProject) => void
  onCreateProject: () => void
}

const statusOptions: { label: string; value: ProjectStatusFilter }[] = [
  { label: 'All statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Archived', value: 'archived' },
]

const sortOptions: { label: string; value: ProjectSort }[] = [
  { label: 'Recently updated', value: 'recent' },
  { label: 'Oldest updated', value: 'oldest' },
  { label: 'Name A–Z', value: 'name' },
]

function formatUpdatedDate(value?: number) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(value)
}

function StatusLabel({ status }: { status: ProjectStatus }) {
  const labels: Record<ProjectStatus, string> = { active: 'Active', paused: 'Paused', archived: 'Archived' }
  return <span className={`all-project-status is-${status}`}>{labels[status]}</span>
}

function ProjectTableSkeleton() {
  return <>
    {Array.from({ length: 5 }, (_, index) => <TableRow key={index} aria-hidden="true">
      <TableCell><Skeleton variant="text" width={`${48 + index * 7}%`} /><Skeleton variant="text" width="36%" /></TableCell>
      <TableCell><Skeleton variant="text" width="62%" /></TableCell>
      <TableCell><Skeleton variant="text" width={54} /></TableCell>
      <TableCell><Skeleton variant="text" width={84} /></TableCell>
      <TableCell><Skeleton variant="rounded" width={58} height={22} /></TableCell>
    </TableRow>)}
  </>
}

export function AllProjectsPage({ projects, projectsLoading, projectsError, onRetryProjects, onProjectOpen, onCreateProject }: AllProjectsPageProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ProjectStatusFilter>('all')
  const [subject, setSubject] = useState('all')
  const [sort, setSort] = useState<ProjectSort>('recent')
  const isInitialLoading = projectsLoading && projects.length === 0
  const subjectOptions = useMemo(() => Array.from(new Set(projects.map((project) => project.subject.trim()).filter(Boolean))).sort((left, right) => left.localeCompare(right)), [projects])
  const activeCount = projects.filter((project) => (project.status ?? 'active') === 'active').length
  const pausedOrArchivedCount = projects.length - activeCount
  const topicCount = projects.reduce((count, project) => count + project.topics.length, 0)
  const visibleProjects = useMemo(() => {
    const normalizedQuery = search.trim().toLocaleLowerCase()
    const filtered = projects.filter((project) => {
      const matchesSearch = !normalizedQuery || project.name.toLocaleLowerCase().includes(normalizedQuery)
      const matchesStatus = status === 'all' || (project.status ?? 'active') === status
      const matchesSubject = subject === 'all' || project.subject === subject
      return matchesSearch && matchesStatus && matchesSubject
    })

    return filtered.sort((left, right) => {
      if (sort === 'name') return left.name.localeCompare(right.name)
      const delta = (left.updatedAt ?? 0) - (right.updatedAt ?? 0)
      return sort === 'recent' ? -delta : delta
    })
  }, [projects, search, sort, status, subject])

  const metrics = [
    { label: 'Total projects', value: projects.length.toLocaleString('en-US'), description: 'Across all subject areas', width: 58 },
    { label: 'Active projects', value: activeCount.toLocaleString('en-US'), description: `${pausedOrArchivedCount.toLocaleString('en-US')} paused or archived`, width: 48 },
    { label: 'Tracked topics', value: topicCount.toLocaleString('en-US'), description: 'Across your projects', width: 50 },
  ]

  return <Box className="all-projects-page">
    <Box className="all-projects-heading">
      <Box>
        <Typography component="h1">All Projects</Typography>
        <Typography className="all-projects-description">Monitor research projects, topic coverage, and recent activity.</Typography>
      </Box>
      <Button className="all-projects-create-button" variant="contained" startIcon={<PlusIcon width={16} height={16} />} onClick={onCreateProject}>Create project</Button>
    </Box>

    <Box className="all-projects-metrics">
      {metrics.map((metric) => <Paper variant="outlined" className="all-projects-metric-card" key={metric.label} aria-busy={isInitialLoading}>
        <Typography>{metric.label}</Typography>
        <strong>{isInitialLoading ? <ProjectInlineSkeleton width={metric.width} height={34} /> : metric.value}</strong>
        {isInitialLoading ? <Skeleton className="all-projects-metric-description-skeleton" variant="text" width="64%" aria-hidden="true" /> : <Typography className="all-projects-metric-description">{metric.description}</Typography>}
      </Paper>)}
    </Box>

    <Paper variant="outlined" className="all-projects-toolbar">
      <Box className="all-projects-search">
        <MagnifyingGlassIcon width={16} height={16} aria-hidden="true" />
        <InputBase value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects by name" inputProps={{ 'aria-label': 'Search projects by name' }} />
      </Box>
      <Select className="all-projects-select" size="small" value={status} onChange={(event) => setStatus(event.target.value as ProjectStatusFilter)} inputProps={{ 'aria-label': 'Filter by status' }}>
        {statusOptions.map((option) => <MenuItem value={option.value} key={option.value}>{option.label}</MenuItem>)}
      </Select>
      <Select className="all-projects-select all-projects-subject-select" size="small" value={subject} onChange={(event) => setSubject(event.target.value)} inputProps={{ 'aria-label': 'Filter by subject area' }}>
        <MenuItem value="all">All subject areas</MenuItem>
        {subjectOptions.map((option) => <MenuItem value={option} key={option}>{option}</MenuItem>)}
      </Select>
      <Select className="all-projects-select all-projects-sort-select" size="small" value={sort} onChange={(event) => setSort(event.target.value as ProjectSort)} inputProps={{ 'aria-label': 'Sort projects' }}>
        {sortOptions.map((option) => <MenuItem value={option.value} key={option.value}>{option.label}</MenuItem>)}
      </Select>
    </Paper>

    <Paper variant="outlined" className="all-projects-table-card">
      {projectsError
        ? <Box className="all-projects-message" role="alert">
          <Typography>Could not load your projects.</Typography>
          <Button variant="outlined" onClick={onRetryProjects}>Retry</Button>
        </Box>
        : <TableContainer className="all-projects-table-wrap" aria-busy={isInitialLoading}>
          <Table className="all-projects-table" aria-label="All projects">
            <TableHead><TableRow>
              <TableCell>Project</TableCell>
              <TableCell>Subject area</TableCell>
              <TableCell>Topics</TableCell>
              <TableCell>Last updated</TableCell>
              <TableCell>Status</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {isInitialLoading ? <ProjectTableSkeleton />
                : visibleProjects.length ? visibleProjects.map((project) => <TableRow key={project.id} hover>
                  <TableCell><Button className="all-project-name" onClick={() => onProjectOpen(project)}>{project.name}</Button></TableCell>
                  <TableCell>{project.subject || 'Not specified'}</TableCell>
                  <TableCell>{project.topics.length}</TableCell>
                  <TableCell>{formatUpdatedDate(project.updatedAt)}</TableCell>
                  <TableCell><StatusLabel status={project.status ?? 'active'} /></TableCell>
                </TableRow>)
                  : <TableRow><TableCell colSpan={5}>
                    <Box className="all-projects-message">
                      {projects.length === 0
                        ? <><Typography>No projects yet</Typography><Typography className="all-projects-message-description">Create a project to start tracking research topics.</Typography><Button variant="contained" onClick={onCreateProject}>Create project</Button></>
                        : <><Typography>No projects match these filters.</Typography><Button variant="outlined" onClick={() => { setSearch(''); setStatus('all'); setSubject('all') }}>Clear filters</Button></>}
                    </Box>
                  </TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>}
    </Paper>
  </Box>
}
