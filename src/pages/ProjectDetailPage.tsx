import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Box, Button, ButtonBase, IconButton, InputBase, MenuItem, Paper, Select, Tooltip, Typography } from '@mui/material'
import {
  ChartBarIcon,
  ClockIcon,
  Cog6ToothIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import type { LocalProject, ProjectTab } from '../types/project'
import { getProjectOverview, type WorkerProjectOverview } from '../services/workerApi'

const projectTabs: { label: string; value: ProjectTab }[] = [
  { label: 'Overview', value: 'overview' },
  { label: 'News Feed', value: 'news-feed' },
  { label: 'Keywords & Monitoring', value: 'keywords-monitoring' },
  { label: 'Members', value: 'members' },
]

const publications = [
  { type: 'Journal article', year: 2026, title: 'Deep learning for medical image analysis: a systematic review', keyword: 'Deep Learning' },
  { type: 'Conference paper', year: 2025, title: 'Neural network architectures in diagnostic imaging', keyword: 'Neural Networks' },
  { type: 'Journal article', year: 2025, title: 'Artificial intelligence in clinical image interpretation', keyword: 'Medical Imaging' },
]

type ProjectDetailPageProps = {
  project: LocalProject
  activeTab: ProjectTab
  onTabChange: (tab: ProjectTab) => void
}

type DistributionItem = { label: string; count: number }
type ProjectOverviewData = {
  totalWorks: number
  years: { year: number; count: number }[]
  types: DistributionItem[]
  subjects: DistributionItem[]
  journalCount: number
  journalCountComplete: boolean
  growthRate: number | null
  updatedAt: string
}

type ProjectOverviewRequest =
  | { key: string; status: 'success'; data: ProjectOverviewData }
  | { key: string; status: 'error'; message: string }

function buildProjectSearch(topics: string[], subject: string) {
  const terms = topics.map((topic) => topic.replace(/["\\]/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean)
  const included: string[] = []

  for (const term of terms) {
    if (`(${[...included, `"${term}"`].join(' OR ')})`.length > 280) break
    included.push(`"${term}"`)
  }

  const fallbackSubject = subject.replace(/["\\]/g, '').replace(/\s+/g, ' ').trim()
  const query = included.length ? `(${included.join(' OR ')})` : `"${fallbackSubject}"`
  return { query }
}

function buildProjectOverview(overview: WorkerProjectOverview): ProjectOverviewData {
  return {
    totalWorks: overview.total_works,
    years: overview.years,
    types: overview.source_types,
    subjects: overview.subject_areas,
    journalCount: overview.journal_count,
    journalCountComplete: overview.journal_count_complete,
    growthRate: overview.growth_rate,
    updatedAt: overview.updated_at,
  }
}

export function ProjectDetailPage({ project, activeTab, onTabChange }: ProjectDetailPageProps) {
  const projectTabsRef = useRef<HTMLElement | null>(null)
  const [publicationQuery, setPublicationQuery] = useState('')
  const [publicationYear, setPublicationYear] = useState('All years')
  const [trackedTopics, setTrackedTopics] = useState(project.topics)
  const [topicQuery, setTopicQuery] = useState('')
  const [newTopic, setNewTopic] = useState('')
  const [memberQuery, setMemberQuery] = useState('')
  const [overviewRequestVersion, setOverviewRequestVersion] = useState(0)
  const [overviewRequest, setOverviewRequest] = useState<ProjectOverviewRequest | null>(null)
  const projectSearch = useMemo(() => buildProjectSearch(trackedTopics, project.subject), [project.subject, trackedTopics])
  const overviewRequestKey = JSON.stringify([project.id, projectSearch.query, overviewRequestVersion])
  const activeOverviewRequest = overviewRequest?.key === overviewRequestKey ? overviewRequest : null
  const overviewData = activeOverviewRequest?.status === 'success' ? activeOverviewRequest.data : null
  const overviewError = activeOverviewRequest?.status === 'error' ? activeOverviewRequest.message : ''
  const overviewLoading = activeOverviewRequest === null

  useEffect(() => {
    const controller = new AbortController()
    getProjectOverview(projectSearch.query, controller.signal)
      .then((result) => {
        setOverviewRequest({
          key: overviewRequestKey,
          status: 'success',
          data: buildProjectOverview(result),
        })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setOverviewRequest({
            key: overviewRequestKey,
            status: 'error',
            message: error instanceof Error ? error.message : 'Could not load OpenAlex project data.',
          })
        }
      })

    return () => controller.abort()
  }, [overviewRequestKey, projectSearch.query])

  useEffect(() => {
    const tabs = projectTabsRef.current
    const currentTab = tabs?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!tabs || !currentTab) return

    const tabsBounds = tabs.getBoundingClientRect()
    const currentTabBounds = currentTab.getBoundingClientRect()
    if (currentTabBounds.left < tabsBounds.left) {
      tabs.scrollLeft -= tabsBounds.left - currentTabBounds.left
    } else if (currentTabBounds.right > tabsBounds.right) {
      tabs.scrollLeft += currentTabBounds.right - tabsBounds.right
    }
  }, [activeTab])

  const visiblePublications = useMemo(() => {
    const query = publicationQuery.trim().toLocaleLowerCase()
    return publications.filter((publication) => {
      const matchesQuery = !query || `${publication.title} ${publication.keyword}`.toLocaleLowerCase().includes(query)
      const matchesYear = publicationYear === 'All years' || String(publication.year) === publicationYear
      return matchesQuery && matchesYear
    })
  }, [publicationQuery, publicationYear])

  const visibleTopics = useMemo(() => {
    const query = topicQuery.trim().toLocaleLowerCase()
    return trackedTopics.filter((topic) => topic.toLocaleLowerCase().includes(query))
  }, [topicQuery, trackedTopics])

  const addTopic = () => {
    const value = newTopic.trim()
    if (!value || trackedTopics.some((topic) => topic.toLocaleLowerCase() === value.toLocaleLowerCase())) return
    setTrackedTopics((current) => [...current, value])
    setNewTopic('')
  }

  return (
    <Box className="project-detail-page">
      <Box className="project-detail-header">
        <Box className="project-detail-title-row">
          <Typography component="h1" className="project-detail-title">{project.name}</Typography>
          <Button className="project-settings-button" variant="outlined" startIcon={<Cog6ToothIcon width={14} height={14} />}>
            Project settings
          </Button>
        </Box>
        <Typography className="project-detail-description">Monitor scientific publications and research topics.</Typography>
      </Box>

      <Box ref={projectTabsRef} component="nav" className="project-detail-tabs" aria-label="Project sections">
        {projectTabs.map((tab) => <ButtonBase
          key={tab.value}
          className={`project-detail-tab${activeTab === tab.value ? ' is-active' : ''}`}
          onClick={() => onTabChange(tab.value)}
          aria-current={activeTab === tab.value ? 'page' : undefined}
        >
          {tab.label}
        </ButtonBase>)}
      </Box>

      {activeTab === 'overview' && <OverviewContent
        topics={trackedTopics}
        data={overviewData}
        loading={overviewLoading}
        error={overviewError}
        onRetry={() => setOverviewRequestVersion((version) => version + 1)}
      />}
      {activeTab === 'news-feed' && <NewsFeedContent
        topics={trackedTopics}
        publicationQuery={publicationQuery}
        onPublicationQueryChange={setPublicationQuery}
        publicationYear={publicationYear}
        onPublicationYearChange={setPublicationYear}
        visiblePublications={visiblePublications}
      />}
      {activeTab === 'keywords-monitoring' && <KeywordContent
        trackedTopics={trackedTopics}
        visibleTopics={visibleTopics}
        topicQuery={topicQuery}
        onTopicQueryChange={setTopicQuery}
        newTopic={newTopic}
        onNewTopicChange={setNewTopic}
        onAddTopic={addTopic}
        onRemoveTopic={(topic) => setTrackedTopics((current) => current.filter((item) => item !== topic))}
      />}
      {activeTab === 'members' && <MembersContent memberQuery={memberQuery} onMemberQueryChange={setMemberQuery} />}
    </Box>
  )
}

function OverviewContent({
  topics,
  data,
  loading,
  error,
  onRetry,
}: {
  topics: string[]
  data: ProjectOverviewData | null
  loading: boolean
  error: string
  onRetry: () => void
}) {
  const growthRate = data?.growthRate
  const metrics = [
    { label: 'Related articles', value: loading || error ? '—' : data ? formatWorkCount(data.totalWorks) : '0' },
    { label: 'Growth rate', value: loading || error || growthRate === null || growthRate === undefined ? '—' : `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%` },
    { label: 'Tracked keywords', value: String(topics.length) },
    { label: 'New alerts / 24h', value: '0' },
  ]

  return <Box className="project-overview-content">
    <Box className="project-overview-heading">
      <Typography component="h2" className="project-section-heading">Project Overview</Typography>
    </Box>
    <Box className="project-metric-grid">
      {metrics.map((metric) => <Paper variant="outlined" className="project-metric-card" key={metric.label}>
        <Typography>{metric.label}</Typography>
        <strong>{metric.value}</strong>
      </Paper>)}
    </Box>
    <Box className="project-chart-grid">
      <Paper variant="outlined" className="project-chart-card publication-trend-card">
        <Typography component="h3">Publication Trend</Typography>
        <Typography className="project-card-description">Related publications over time</Typography>
        {loading
          ? <EmptyState icon={<ChartBarIcon width={28} height={28} />} title="Loading project data" description="Fetching publication metrics from OpenAlex." />
          : error
            ? <OverviewErrorState message={error} onRetry={onRetry} />
            : data?.years.length
              ? <PublicationTrendChart years={data.years} />
              : <EmptyState icon={<ChartBarIcon width={28} height={28} />} title="Waiting for publication data" description="Related publication trends will appear here." />}
      </Paper>
      <Paper variant="outlined" className="project-chart-card subject-distribution-card">
        <Typography component="h3">Subject Area Distribution</Typography>
        <Typography className="project-card-description">Publications by research field</Typography>
        {loading
          ? <EmptyState icon={<ClockIcon width={28} height={28} />} title="Loading distribution" description="Subject area breakdown will appear here." />
          : error
            ? <EmptyState icon={<ClockIcon width={23} height={23} />} title="Distribution unavailable" description={error} />
            : data?.totalWorks && data.subjects.length
              ? <SubjectAreaChart items={data.subjects} />
              : <EmptyState icon={<ClockIcon width={28} height={28} />} title="No distribution data" description="Subject area breakdown will appear here." />}
      </Paper>
    </Box>
    <Box className="project-summary-grid">
      <Paper variant="outlined" className="project-chart-card publication-type-card">
        <Typography component="h3">Publication Type Distribution</Typography>
        <Typography className="project-card-description">Journal, conference and other sources</Typography>
        {loading
          ? <EmptyState icon={<ChartBarIcon width={28} height={28} />} title="Loading distribution" description="Publication type trends will appear here." />
          : error
            ? <EmptyState icon={<ChartBarIcon width={24} height={24} />} title="Type data unavailable" description={error} />
            : data?.totalWorks && data.types.some((item) => item.count > 0)
              ? <PublicationTypeChart items={data.types.filter((item) => item.count > 0)} />
              : <EmptyState icon={<ChartBarIcon width={28} height={28} />} title="No publication data" description="Publication type trends will appear here." />}
      </Paper>
      <Paper variant="outlined" className="project-chart-card monitoring-summary-card">
        <Typography component="h3">Monitoring Summary</Typography>
        <SummaryRow
          label="Total journals"
          value={loading || error ? '—' : data ? `${formatWorkCount(data.journalCount)}${data.journalCountComplete ? '' : '+'}` : '0'}
        />
        <SummaryRow label="Last updated" value={loading ? 'Loading…' : data ? new Date(data.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not available'} />
        <SummaryRow label="New alerts" value="0" />
      </Paper>
    </Box>
  </Box>
}

function formatWorkCount(count: number) {
  return new Intl.NumberFormat('en-US').format(count)
}

function OverviewErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <Box className="project-overview-error" role="alert">
    <Typography>{message}</Typography>
    <Button size="small" variant="outlined" onClick={onRetry}>Retry</Button>
  </Box>
}

function PublicationTrendChart({ years }: { years: ProjectOverviewData['years'] }) {
  const width = 662
  const height = 168
  const maxCount = Math.max(...years.map((item) => item.count), 1)
  const tickMax = Math.max(15, Math.ceil(maxCount / 15) * 15)
  const ticks = [tickMax, tickMax * 0.75, tickMax * 0.5, tickMax * 0.25, 0]
  const plotLeft = 36
  const plotRight = 650
  const plotTop = 20
  const plotBottom = 138
  const points = years.map((item, index) => ({
    ...item,
    x: years.length === 1 ? (plotLeft + plotRight) / 2 : plotLeft + (index / (years.length - 1)) * (plotRight - plotLeft),
    y: plotBottom - (item.count / tickMax) * (plotBottom - plotTop),
  }))

  return <Box className="publication-trend-chart" role="group" aria-label="Publication counts by year">
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      {ticks.map((tick, index) => {
        const y = plotTop + (index / (ticks.length - 1)) * (plotBottom - plotTop)
        return <line key={tick} x1={plotLeft} x2={plotRight} y1={y} y2={y} className="publication-trend-gridline" />
      })}
      <polyline points={points.map((point) => `${point.x},${point.y}`).join(' ')} className="publication-trend-line" />
    </svg>
    {ticks.map((tick, index) => {
      const y = plotTop + (index / (ticks.length - 1)) * (plotBottom - plotTop)
      return <span key={tick} className="publication-trend-axis-label" style={{ top: `${y / height * 100}%` }} aria-hidden="true">
        {formatTrendTick(tick)}
      </span>
    })}
    {points.map((point) => <span key={point.year} className="publication-trend-year-label" style={{ left: `${point.x / width * 100}%` }} aria-hidden="true">
      {point.year}
    </span>)}
    {points.map((point) => {
      const tooltip = `${point.year}: ${formatWorkCount(point.count)} publications`
      return <Tooltip key={point.year} title={tooltip} placement="top" arrow>
        <span
          className="publication-trend-point"
          style={{ left: `${point.x / width * 100}%`, top: `${point.y / height * 100}%` }}
          tabIndex={0}
          role="img"
          aria-label={tooltip}
        />
      </Tooltip>
    })}
  </Box>
}

function formatTrendTick(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return new Intl.NumberFormat('en-US').format(Math.round(value))
}

const subjectChartColors = ['#2563eb', '#e8793b', '#3e8e4e', '#e5b54a']
const publicationTypeColors = ['#2563eb', '#3e8e4e', '#e8793b', '#9aa1aa']

function makeDonutStyle(items: DistributionItem[], colors: string[]) {
  const total = items.reduce((sum, item) => sum + item.count, 0)
  const nonZeroItems = items.map((item, index) => ({ item, index })).filter(({ item }) => item.count > 0)
  const gap = nonZeroItems.length ? 0.55 : 0
  const totalGap = gap * nonZeroItems.length
  const available = 100 - totalGap
  let cursor = 0
  const colorStops = nonZeroItems.flatMap(({ item, index }) => {
    const start = cursor
    const end = start + (item.count / total) * available
    cursor = end + gap
    return [`${colors[index % colors.length]} ${start}% ${end}%`, `#ffffff ${end}% ${cursor}%`]
  })
  return { background: `conic-gradient(${colorStops.join(', ')})` }
}

function Donut({ items, colors, className, centerLabel }: {
  items: DistributionItem[]
  colors: string[]
  className: string
  centerLabel?: string
}) {
  const [hoveredItem, setHoveredItem] = useState<DistributionItem | null>(null)
  const total = items.reduce((sum, item) => sum + item.count, 0)
  const segments = items.filter((item) => item.count > 0)
  const tooltip = hoveredItem
    ? `${hoveredItem.label}: ${formatWorkCount(hoveredItem.count)} publications (${Math.round(hoveredItem.count / total * 100)}%)`
    : `${formatWorkCount(total)} publications total`

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const centerX = bounds.width / 2
    const centerY = bounds.height / 2
    const x = event.clientX - bounds.left - centerX
    const y = event.clientY - bounds.top - centerY
    const radius = Math.hypot(x, y)
    const outerRadius = Math.min(bounds.width, bounds.height) / 2

    if (!total || radius < outerRadius * 0.53 || radius > outerRadius) {
      setHoveredItem(null)
      return
    }

    const anglePercent = ((Math.atan2(y, x) * 180 / Math.PI + 450) % 360) / 360 * 100
    const gap = segments.length ? 0.55 : 0
    const available = 100 - gap * segments.length
    let cursor = 0
    let match: DistributionItem | null = null

    for (const item of segments) {
      const end = cursor + item.count / total * available
      if (anglePercent >= cursor && anglePercent < end) {
        match = item
        break
      }
      cursor = end + gap
    }

    setHoveredItem((current) => current?.label === match?.label ? current : match)
  }

  return <Tooltip title={tooltip} placement="top" arrow>
    <Box
      className={className}
      style={makeDonutStyle(items, colors)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredItem(null)}
      tabIndex={0}
      role="img"
      aria-label={`${formatWorkCount(total)} publications across ${segments.length} categories`}
    >
      <Box className="donut-hole">{centerLabel && <span>{centerLabel}</span>}</Box>
    </Box>
  </Tooltip>
}

function Legend({ items, colors }: { items: DistributionItem[]; colors: string[] }) {
  const total = items.reduce((sum, item) => sum + item.count, 0)

  return <Box className="distribution-legend">
    {items.map((item, index) => {
      const share = total ? Math.round(item.count / total * 100) : 0
      const tooltip = `${item.label}: ${formatWorkCount(item.count)} publications (${share}%)`
      return <Tooltip key={item.label} title={tooltip} placement="top" arrow>
        <Box className="distribution-legend-row" tabIndex={0} role="img" aria-label={tooltip}>
          <span className="distribution-legend-dot" style={{ background: colors[index % colors.length] }} />
          <Typography title={item.label}>{item.label}</Typography>
          <span className="distribution-legend-share">{share}%</span>
        </Box>
      </Tooltip>
    })}
  </Box>
}

function SubjectAreaChart({ items }: { items: DistributionItem[] }) {
  return <Box className="subject-area-chart">
    <Legend items={items} colors={subjectChartColors} />
    <Donut items={items} colors={subjectChartColors} className="subject-donut" centerLabel="100%" />
  </Box>
}

function PublicationTypeChart({ items }: { items: DistributionItem[] }) {
  return <Box className="publication-type-chart">
    <Legend items={items} colors={publicationTypeColors} />
    <Donut items={items} colors={publicationTypeColors} className="publication-type-donut" />
  </Box>
}

function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return <Box className="project-empty-state">
    <Box className="project-empty-icon" aria-hidden="true">{icon}</Box>
    <Typography>{title}</Typography>
    <Typography>{description}</Typography>
  </Box>
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <Box className="project-summary-row">
    <Typography>{label}</Typography>
    <Typography>{value}</Typography>
  </Box>
}

type VisiblePublication = typeof publications[number]

function NewsFeedContent({
  topics,
  publicationQuery,
  onPublicationQueryChange,
  publicationYear,
  onPublicationYearChange,
  visiblePublications,
}: {
  topics: string[]
  publicationQuery: string
  onPublicationQueryChange: (value: string) => void
  publicationYear: string
  onPublicationYearChange: (value: string) => void
  visiblePublications: VisiblePublication[]
}) {
  const matchedTopics = topics.length ? topics : ['No tracked keywords']

  return <Box className="project-tab-content">
    <Box className="project-tab-intro">
      <Typography component="h2" className="project-section-heading">Scientific News Feed</Typography>
      <Box className="project-count-pill">128 articles</Box>
    </Box>
    <Box className="news-feed-grid">
      <Paper variant="outlined" className="news-publications-card">
        <Box className="project-input-frame">
          <InputBase
            value={publicationQuery}
            onChange={(event) => onPublicationQueryChange(event.target.value)}
            placeholder="Search title or research keyword..."
            inputProps={{ 'aria-label': 'Search publications' }}
          />
        </Box>
        <Box className="publication-list-heading">
          <Typography>Recent Publications</Typography>
          <Typography>Newest first</Typography>
        </Box>
        <Box className="project-publication-list">
          {visiblePublications.length ? visiblePublications.map((publication) => <Box className="project-publication" key={publication.title}>
            <Box className="project-publication-meta">
              <Typography>{publication.type}</Typography>
              <Typography>{publication.year}</Typography>
            </Box>
            <Typography component="h3">{publication.title}</Typography>
            <Box className="project-topic-pill">{publication.keyword}</Box>
          </Box>) : <Box className="project-list-empty">No publications match this search.</Box>}
        </Box>
      </Paper>

      <Paper variant="outlined" className="news-filter-card">
        <Typography component="h3">Filter Panel</Typography>
        <Typography className="news-filter-label">Publication year</Typography>
        <Select
          value={publicationYear}
          onChange={(event) => onPublicationYearChange(event.target.value)}
          size="small"
          className="publication-year-select"
          inputProps={{ 'aria-label': 'Publication year' }}
        >
          {['All years', '2026', '2025'].map((year) => <MenuItem value={year} key={year}>{year}</MenuItem>)}
        </Select>
        <Box className="news-filter-divider" />
        <Typography className="news-filter-label">Matched keywords</Typography>
        <Box className="matched-keyword-list">
          {matchedTopics.map((topic) => <Box className="matched-keyword" key={topic}>
            <span className="keyword-diamond" aria-hidden="true" />
            <Typography>{topic}</Typography>
          </Box>)}
        </Box>
        <Typography className="news-filter-help">Filters update the publication list.</Typography>
      </Paper>
    </Box>
  </Box>
}

function KeywordContent({
  trackedTopics,
  visibleTopics,
  topicQuery,
  onTopicQueryChange,
  newTopic,
  onNewTopicChange,
  onAddTopic,
  onRemoveTopic,
}: {
  trackedTopics: string[]
  visibleTopics: string[]
  topicQuery: string
  onTopicQueryChange: (value: string) => void
  newTopic: string
  onNewTopicChange: (value: string) => void
  onAddTopic: () => void
  onRemoveTopic: (topic: string) => void
}) {
  return <Box className="project-tab-content">
    <Box className="project-tab-intro">
      <Typography component="h2" className="project-section-heading">Keywords &amp; Monitoring</Typography>
      <Box className="project-count-pill">{trackedTopics.length} tracked</Box>
    </Box>
    <Box className="keyword-monitoring-grid">
      <Paper variant="outlined" className="watchlist-card">
        <Typography component="h3">Watchlist</Typography>
        <Box className="project-input-frame">
          <InputBase
            value={topicQuery}
            onChange={(event) => onTopicQueryChange(event.target.value)}
            placeholder="Search tracked keywords..."
            inputProps={{ 'aria-label': 'Search tracked keywords' }}
          />
        </Box>
        <Box className="tracked-keyword-list">
          {visibleTopics.length ? visibleTopics.map((topic) => <Box className="tracked-keyword-row" key={topic}>
            <Typography>{topic}</Typography>
            <IconButton aria-label={`Remove ${topic}`} size="small" onClick={() => onRemoveTopic(topic)}>
              <XMarkIcon width={14} height={14} />
            </IconButton>
          </Box>) : <Typography className="project-list-empty">No tracked keywords found.</Typography>}
        </Box>
        <Box className="watchlist-actions">
          <Box className="project-input-frame">
            <InputBase
              value={newTopic}
              onChange={(event) => onNewTopicChange(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); onAddTopic() } }}
              placeholder="New keyword..."
              inputProps={{ 'aria-label': 'New keyword' }}
            />
          </Box>
          <Button variant="contained" disabled={!newTopic.trim()} startIcon={<PlusIcon width={15} height={15} />} onClick={onAddTopic}>Add Keyword</Button>
        </Box>
      </Paper>

      <Paper variant="outlined" className="keyword-results-card">
        <Typography component="h3">Keyword Monitoring Results</Typography>
        <Typography className="project-card-description">Publication activity associated with the tracked keywords</Typography>
        <Box className="keyword-result-list">
          {trackedTopics.length ? trackedTopics.map((topic) => <Paper variant="outlined" className="keyword-result-row" key={topic}>
            <Box className="keyword-result-header">
              <Typography>{topic}</Typography>
              <Box className="project-count-pill">0 matches</Box>
            </Box>
            <Typography className="keyword-result-status">Matched publications</Typography>
          </Paper>) : <Box className="project-list-empty">Add a keyword to start monitoring publications.</Box>}
        </Box>
      </Paper>
    </Box>
  </Box>
}

function MembersContent({ memberQuery, onMemberQueryChange }: { memberQuery: string; onMemberQueryChange: (value: string) => void }) {
  const hasMatchingMember = !memberQuery.trim() || 'project owner'.includes(memberQuery.trim().toLocaleLowerCase())

  return <Box className="project-tab-content">
    <Box className="project-tab-intro">
      <Typography component="h2" className="project-section-heading">Project Members</Typography>
      <Box className="project-count-pill">1 member</Box>
    </Box>
    <Paper variant="outlined" className="members-card">
      <Box className="members-toolbar">
        <Box className="project-input-frame members-search">
          <InputBase
            value={memberQuery}
            onChange={(event) => onMemberQueryChange(event.target.value)}
            placeholder="Search members..."
            inputProps={{ 'aria-label': 'Search members' }}
          />
        </Box>
        <span className="members-toolbar-spacer" />
        <Button variant="outlined" startIcon={<PlusIcon width={15} height={15} />}>Invite member</Button>
      </Box>
      <Box className="members-table-header">
        <Typography>MEMBER</Typography>
        <Typography>ROLE</Typography>
        <Typography>STATUS</Typography>
      </Box>
      <Box className="members-table-divider" />
      {hasMatchingMember && <Box className="member-table-row">
        <Box className="member-identity">
          <Box className="member-avatar">PO</Box>
          <Typography>Project Owner</Typography>
        </Box>
        <Box className="member-role">Owner</Box>
        <Box className="member-status">Active</Box>
      </Box>}
      {!hasMatchingMember && <Box className="project-list-empty members-empty">No members match this search.</Box>}
    </Paper>
  </Box>
}
