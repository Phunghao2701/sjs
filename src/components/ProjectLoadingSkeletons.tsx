import { Box, Paper, Skeleton } from '@mui/material'

export function ProjectInlineSkeleton({ width = 72, height = 22 }: { width?: number | string; height?: number }) {
  return <Skeleton aria-hidden="true" variant="text" width={width} height={height} />
}

export function ProjectOverviewChartSkeleton({ kind, announce = true }: { kind: 'trend' | 'distribution' | 'types'; announce?: boolean }) {
  const label = kind === 'trend' ? 'Loading publication trend' : kind === 'types' ? 'Loading publication type distribution' : 'Loading subject area distribution'

  return <Box className={`project-overview-chart-skeleton is-${kind}`} role={announce ? 'status' : undefined} aria-label={announce ? label : undefined}>
    {kind === 'trend'
      ? <Box className="trend-chart-skeleton-art" aria-hidden="true">
        <Box className="trend-chart-skeleton-grid">
          {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} variant="rounded" />)}
        </Box>
        <Skeleton className="trend-chart-skeleton-line" variant="rounded" />
        <Box className="trend-chart-skeleton-series">
          {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} variant="circular" />)}
        </Box>
        <Box className="trend-chart-skeleton-years">
          {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} variant="text" />)}
        </Box>
      </Box>
      : <Box className="distribution-chart-skeleton-art" aria-hidden="true">
        <Box className="distribution-chart-skeleton-legend">
          {Array.from({ length: 5 }, (_, index) => <Box className="distribution-chart-skeleton-row" key={index}>
            <Skeleton variant="circular" />
            <Skeleton variant="text" />
            <Skeleton variant="text" />
          </Box>)}
        </Box>
        <Skeleton className="distribution-chart-skeleton-donut" variant="circular" />
      </Box>}
  </Box>
}

export function ProjectPublicationListSkeleton() {
  return <Box className="project-publication-list-skeleton" role="status" aria-label="Loading publications">
    {Array.from({ length: 3 }, (_, index) => <Box className="project-publication project-publication-skeleton" key={index} aria-hidden="true">
      <Box className="publication-skeleton-meta">
        <Skeleton variant="text" width={56} />
        <Skeleton variant="text" width={34} />
      </Box>
      <Skeleton variant="text" width={`${index === 1 ? 68 : 88}%`} />
      <Skeleton variant="text" width="56%" />
      <Skeleton className="publication-skeleton-topic" variant="rounded" width={76} height={22} />
    </Box>)}
  </Box>
}

export function ProjectKeywordRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return <Box className="project-keyword-rows-skeleton" role="status" aria-label="Loading keyword results">
    {Array.from({ length: rows }, (_, index) => <Box className="keyword-row keyword-row-skeleton" key={index} aria-hidden="true">
      <Skeleton variant="text" width={`${48 + (index % 3) * 12}%`} />
      <Skeleton variant="circular" width={22} height={22} />
    </Box>)}
  </Box>
}

export function ProjectRecentRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return <Box className="recent-project-list recent-project-rows-skeleton" role="status" aria-label="Loading saved projects">
    {Array.from({ length: rows }, (_, index) => <Box className="recent-project-row" key={index} aria-hidden="true">
      <Skeleton variant="rounded" width={30} height={30} />
      <Box className="recent-project-copy">
        <Skeleton variant="text" width={`${48 + index * 8}%`} />
        <Skeleton variant="text" width="38%" />
      </Box>
    </Box>)}
  </Box>
}

function ProjectMetricCardSkeleton() {
  return <Paper variant="outlined" className="project-metric-card" aria-hidden="true">
    <Skeleton variant="text" width="58%" />
    <Skeleton variant="text" width="42%" height={31} />
  </Paper>
}

function ProjectOverviewRouteSkeleton() {
  return <Box className="project-overview-content" aria-hidden="true">
    <Box className="project-overview-heading"><Skeleton variant="text" width={190} height={28} /></Box>
    <Box className="project-metric-grid">{Array.from({ length: 4 }, (_, index) => <ProjectMetricCardSkeleton key={index} />)}</Box>
    <Box className="project-chart-grid">
      <Paper variant="outlined" className="project-chart-card"><Skeleton variant="text" width={150} /><Skeleton variant="text" width={180} /><ProjectOverviewChartSkeleton kind="trend" announce={false} /></Paper>
      <Paper variant="outlined" className="project-chart-card"><Skeleton variant="text" width={170} /><Skeleton variant="text" width={160} /><ProjectOverviewChartSkeleton kind="distribution" announce={false} /></Paper>
    </Box>
    <Box className="project-summary-grid">
      <Paper variant="outlined" className="project-chart-card"><Skeleton variant="text" width={190} /><ProjectOverviewChartSkeleton kind="types" announce={false} /></Paper>
      <Paper variant="outlined" className="project-chart-card"><Skeleton variant="text" width={150} />{Array.from({ length: 3 }, (_, index) => <Box className="project-summary-row" key={index}><Skeleton variant="text" width="35%" /><Skeleton variant="text" width="24%" /></Box>)}</Paper>
    </Box>
  </Box>
}

export function ProjectDetailLoadingSkeleton() {
  return <Box className="project-detail-page project-route-loading" role="status" aria-label="Loading project">
    <Box className="project-detail-header" aria-hidden="true">
      <Box className="project-detail-title-row"><Skeleton variant="text" width={210} height={36} /><Skeleton variant="rounded" width={138} height={32} /></Box>
      <Skeleton variant="text" width={330} height={18} />
    </Box>
    <Box className="project-detail-tabs project-route-loading-tabs" aria-hidden="true">
      {[110, 110, 190, 100].map((width, index) => <Skeleton variant="rounded" width={width} height={34} key={index} />)}
    </Box>
    <ProjectOverviewRouteSkeleton />
  </Box>
}
