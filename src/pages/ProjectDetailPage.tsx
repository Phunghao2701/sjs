import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Box, Button, ButtonBase, ClickAwayListener, IconButton, InputBase, MenuItem, Paper, Popper, Select, Typography } from '@mui/material'
import {
  ChartBarIcon,
  CheckIcon,
  ClockIcon,
  Cog6ToothIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import {
  ProjectInlineSkeleton,
  ProjectKeywordRowsSkeleton,
  ProjectOverviewChartSkeleton,
  ProjectPublicationListSkeleton,
} from '../components/ProjectLoadingSkeletons'
import type { LocalProject, ProjectTab } from '../types/project'
import { getKeywordMonitoringResult, type KeywordMonitoringResult } from '../services/keywordMonitoring'
import { getProjectResearchData } from '../services/projectResearchCache'
import { updateProjectTopicsInFirestore } from '../services/projectStore'
import { getProjectOverview, searchKeywords, searchResearch, type ApiPagination, type WorkerKeyword, type WorkerProjectOverview, type WorkerWork } from '../services/workerApi'

const projectTabs: { label: string; value: ProjectTab }[] = [
  { label: 'Overview', value: 'overview' },
  { label: 'News Feed', value: 'news-feed' },
  { label: 'Keywords & Monitoring', value: 'keywords-monitoring' },
  { label: 'Members', value: 'members' },
]
const currentPublicationYear = new Date().getFullYear()

type ProjectDetailPageProps = {
  project: LocalProject
  activeTab: ProjectTab
  onTabChange: (tab: ProjectTab) => void
  onProjectTopicsChange: (topics: string[]) => void
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

type NewsFeedRequest =
  | { key: string; status: 'success'; works: WorkerWork[]; total: number; pagination?: ApiPagination }
  | { key: string; status: 'error'; message: string }

type KeywordMonitoringRequest =
  | { status: 'success'; data: KeywordMonitoringResult }
  | { status: 'error'; message: string }

type KeywordSuggestionsRequest =
  | { key: string; status: 'success'; items: WorkerKeyword[] }
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

export function ProjectDetailPage({ project, activeTab, onTabChange, onProjectTopicsChange }: ProjectDetailPageProps) {
  const projectTabsRef = useRef<HTMLElement | null>(null)
  const [trackedTopics, setTrackedTopics] = useState(project.topics)
  const [topicQuery, setTopicQuery] = useState('')
  const [memberQuery, setMemberQuery] = useState('')
  const [publicationTrendYears, setPublicationTrendYears] = useState(5)
  const [topicsSaving, setTopicsSaving] = useState(false)
  const [topicsSaveError, setTopicsSaveError] = useState('')
  const [overviewRequestVersion, setOverviewRequestVersion] = useState(0)
  const [overviewRequest, setOverviewRequest] = useState<ProjectOverviewRequest | null>(null)
  const projectSearch = useMemo(() => buildProjectSearch(trackedTopics, project.subject), [project.subject, trackedTopics])
  const overviewRequestKey = JSON.stringify([project.id, projectSearch.query, publicationTrendYears, overviewRequestVersion])
  const activeOverviewRequest = overviewRequest?.key === overviewRequestKey ? overviewRequest : null
  const overviewData = activeOverviewRequest?.status === 'success' ? activeOverviewRequest.data : null
  const overviewError = activeOverviewRequest?.status === 'error' ? activeOverviewRequest.message : ''
  const overviewLoading = activeOverviewRequest === null

  useEffect(() => {
    const controller = new AbortController()
    getProjectResearchData(
      project.id,
      JSON.stringify(['overview-year-range-v2', projectSearch.query, publicationTrendYears]),
      (signal) => getProjectOverview(projectSearch.query, publicationTrendYears, signal),
      controller.signal,
    )
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
  }, [overviewRequestKey, project.id, projectSearch.query, publicationTrendYears])

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

  const visibleTopics = useMemo(() => {
    const query = topicQuery.trim().toLocaleLowerCase()
    return trackedTopics.filter((topic) => topic.toLocaleLowerCase().includes(query))
  }, [topicQuery, trackedTopics])

  const saveTopics = async (nextTopics: string[]) => {
    setTopicsSaving(true)
    setTopicsSaveError('')
    try {
      await updateProjectTopicsInFirestore(project.id, nextTopics)
      setTrackedTopics(nextTopics)
      onProjectTopicsChange(nextTopics)
    } catch (error: unknown) {
      setTopicsSaveError(error instanceof Error ? error.message : 'Could not save project keywords.')
    } finally {
      setTopicsSaving(false)
    }
  }

  const addTopic = (topic: string) => {
    const value = topic.trim()
    if (topicsSaving || !value || trackedTopics.some((topic) => topic.toLocaleLowerCase() === value.toLocaleLowerCase())) return
    void saveTopics([...trackedTopics, value])
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
        publicationTrendYears={publicationTrendYears}
        onPublicationTrendYearsChange={setPublicationTrendYears}
        onRetry={() => setOverviewRequestVersion((version) => version + 1)}
      />}
      {activeTab === 'news-feed' && <NewsFeedContent
        projectId={project.id}
        topics={trackedTopics}
        projectQuery={projectSearch.query}
      />}
      {activeTab === 'keywords-monitoring' && <KeywordContent
        projectId={project.id}
        subject={project.subject}
        trackedTopics={trackedTopics}
        visibleTopics={visibleTopics}
        topicQuery={topicQuery}
        onTopicQueryChange={setTopicQuery}
        onAddTopic={addTopic}
        onRemoveTopic={(topic) => {
          if (!topicsSaving) void saveTopics(trackedTopics.filter((item) => item !== topic))
        }}
        topicsSaving={topicsSaving}
        topicsSaveError={topicsSaveError}
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
  publicationTrendYears,
  onPublicationTrendYearsChange,
  onRetry,
}: {
  topics: string[]
  data: ProjectOverviewData | null
  loading: boolean
  error: string
  publicationTrendYears: number
  onPublicationTrendYearsChange: (years: number) => void
  onRetry: () => void
}) {
  const growthRate = data?.growthRate
  const metrics = [
    { label: 'Related articles', value: error ? '—' : data ? formatWorkCount(data.totalWorks) : '0', loading, width: 72 },
    { label: 'Growth rate', value: error || growthRate === null || growthRate === undefined ? '—' : `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`, loading, width: 58 },
    { label: 'Tracked keywords', value: String(topics.length), loading: false, width: 34 },
    { label: 'New alerts / 24h', value: '0', loading: false, width: 28 },
  ]

  return <Box className="project-overview-content">
    <Box className="project-overview-heading">
      <Typography component="h2" className="project-section-heading">Project Overview</Typography>
    </Box>
    <Box className="project-metric-grid">
      {metrics.map((metric) => <Paper variant="outlined" className="project-metric-card" key={metric.label} aria-busy={metric.loading}>
        <Typography>{metric.label}</Typography>
        <strong>{metric.loading ? <ProjectInlineSkeleton width={metric.width} height={30} /> : metric.value}</strong>
      </Paper>)}
    </Box>
    <Box className="project-chart-grid">
      <Paper variant="outlined" className="project-chart-card publication-trend-card">
        <Box className="publication-trend-heading">
          <Typography component="h3">Publication Trend</Typography>
          <Select
            value={publicationTrendYears}
            onChange={(event) => onPublicationTrendYearsChange(Number(event.target.value))}
            size="small"
            className="trend-year-select"
            disabled={loading || Boolean(error) || !data?.years.length}
            inputProps={{ 'aria-label': 'Years shown in publication trend' }}
          >
            {[1, 3, 5].map((years) => <MenuItem value={years} key={years}>{years} {years === 1 ? 'year' : 'years'}</MenuItem>)}
          </Select>
        </Box>
        <Typography className="project-card-description">Related publications over time</Typography>
        {loading
          ? <ProjectOverviewChartSkeleton kind="trend" />
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
          ? <ProjectOverviewChartSkeleton kind="distribution" />
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
          ? <ProjectOverviewChartSkeleton kind="types" />
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
          value={loading ? <ProjectInlineSkeleton width={64} /> : error ? '—' : data ? `${formatWorkCount(data.journalCount)}${data.journalCountComplete ? '' : '+'}` : '0'}
        />
        <SummaryRow label="Last updated" value={loading ? <ProjectInlineSkeleton width={92} /> : data ? new Date(data.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not available'} />
        <SummaryRow label="New alerts" value="0" />
      </Paper>
    </Box>
  </Box>
}

function formatWorkCount(count: number) {
  return new Intl.NumberFormat('en-US').format(count)
}

function formatKeywordMatchCount(count: number) {
  // The Worker caps OpenAlex search totals at 10,000, so this is a lower-bound label at the cap.
  const formattedCount = formatWorkCount(count)
  return count >= 10_000 ? `${formattedCount}+` : formattedCount
}

function OverviewErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <Box className="project-overview-error" role="alert">
    <Typography>{message}</Typography>
    <Button size="small" variant="outlined" onClick={onRetry}>Retry</Button>
  </Box>
}

type ChartPopoverDetails = {
  title: string
  color: string
  label: string
  value?: string
}

type ChartPopoverData = ChartPopoverDetails & { x: number; y: number }

function popoverAtPointer(event: MouseEvent<HTMLElement>, details: ChartPopoverDetails): ChartPopoverData {
  return { ...details, x: event.clientX, y: event.clientY }
}

function ChartHoverPopover({ data }: { data: ChartPopoverData | null }) {
  const anchorEl = data ? { getBoundingClientRect: () => new DOMRect(data.x, data.y, 0, 0) } : null

  return <Popper
    className="chart-hover-popover-popper"
    open={Boolean(data)}
    anchorEl={anchorEl}
    placement="top"
    popperOptions={{ strategy: 'fixed' }}
    modifiers={[
      { name: 'offset', options: { offset: [0, 10] } },
      { name: 'preventOverflow', options: { padding: 8 } },
    ]}
  >
    {data && <Paper className="chart-hover-popover" role="tooltip" elevation={0}>
      <Typography component="p" className="chart-hover-popover-title">{data.title}</Typography>
      <Box className="chart-hover-popover-row">
        <span className="chart-hover-popover-dot" style={{ backgroundColor: data.color }} />
        <Typography component="p" className="chart-hover-popover-label">{data.label}</Typography>
        {data.value && <strong className="chart-hover-popover-value">{data.value}</strong>}
      </Box>
    </Paper>}
  </Popper>
}

function PublicationTrendChart({ years }: { years: ProjectOverviewData['years'] }) {
  const [hoveredYear, setHoveredYear] = useState<number | null>(null)
  const [popover, setPopover] = useState<ChartPopoverData | null>(null)
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

  return <>
    <Box className="publication-trend-chart" role="group" aria-label="Publication counts by year">
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
        const isActive = hoveredYear === point.year
        const details = {
          title: String(point.year),
          color: '#2563eb',
          label: `${formatWorkCount(point.count)} publications`,
        }
      return <span
        key={point.year}
        className={`publication-trend-point${isActive ? ' is-active' : ''}`}
        style={{ left: `${point.x / width * 100}%`, top: `${point.y / height * 100}%` }}
        role="img"
        aria-label={`${point.year}: ${formatWorkCount(point.count)} publications`}
        onMouseEnter={(event) => {
          setHoveredYear(point.year)
          setPopover(popoverAtPointer(event, details))
        }}
        onMouseMove={(event) => setPopover(popoverAtPointer(event, details))}
        onMouseLeave={() => {
          setHoveredYear(null)
          setPopover(null)
        }}
      />
      })}
    </Box>
    <ChartHoverPopover data={popover} />
  </>
}

function formatTrendTick(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return new Intl.NumberFormat('en-US').format(Math.round(value))
}

const subjectChartColors = ['#2563eb', '#e8793b', '#3e8e4e', '#e5b54a']
const publicationTypeColors = ['#2563eb', '#3e8e4e', '#e8793b', '#9aa1aa']

type DonutSegment = {
  item: DistributionItem
  index: number
  start: number
  end: number
}

function getDonutSegments(items: DistributionItem[]): DonutSegment[] {
  const total = items.reduce((sum, item) => sum + item.count, 0)
  const nonZeroItems = items.map((item, index) => ({ item, index })).filter(({ item }) => item.count > 0)
  const gap = nonZeroItems.length ? 0.55 : 0
  const available = 100 - gap * nonZeroItems.length
  let cursor = 0
  return nonZeroItems.map(({ item, index }) => {
    const start = cursor
    const end = start + (item.count / total) * available
    cursor = end + gap
    return { item, index, start, end }
  })
}

function donutPoint(radius: number, angle: number) {
  const radians = (angle - 90) * Math.PI / 180
  return { x: 50 + radius * Math.cos(radians), y: 50 + radius * Math.sin(radians) }
}

function donutSegmentPath(startPercent: number, endPercent: number) {
  const startAngle = startPercent * 3.6
  const endAngle = endPercent * 3.6
  const span = endAngle - startAngle
  const outerStart = donutPoint(49, startAngle)
  const outerEnd = donutPoint(49, endAngle)
  const innerEnd = donutPoint(25.5, endAngle)
  const innerStart = donutPoint(25.5, startAngle)
  const largeArc = span > 180 ? 1 : 0
  return `M ${outerStart.x} ${outerStart.y} A 49 49 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A 25.5 25.5 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y} Z`
}

function Donut({ items, colors, className, centerLabel, hoveredIndex, onHoveredIndexChange, onPopoverChange }: {
  items: DistributionItem[]
  colors: string[]
  className: string
  centerLabel?: string
  hoveredIndex: number | null
  onHoveredIndexChange: (index: number | null) => void
  onPopoverChange: (data: ChartPopoverData | null) => void
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0)
  const segments = getDonutSegments(items)
  const activeSegment = segments.find(({ index }) => index === hoveredIndex)
  const renderSegments = activeSegment
    ? [...segments.filter(({ index }) => index !== hoveredIndex), activeSegment]
    : segments

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const centerX = bounds.width / 2
    const centerY = bounds.height / 2
    const x = event.clientX - bounds.left - centerX
    const y = event.clientY - bounds.top - centerY
    const radius = Math.hypot(x, y)
    const outerRadius = Math.min(bounds.width, bounds.height) / 2

    if (!total || radius < outerRadius * 0.48 || radius > outerRadius * 1.08) {
      onHoveredIndexChange(null)
      onPopoverChange(null)
      return
    }

    const anglePercent = ((Math.atan2(y, x) * 180 / Math.PI + 450) % 360) / 360 * 100
    const match = segments.find(({ start, end }) => anglePercent >= start && anglePercent < end)
    onHoveredIndexChange(match?.index ?? null)
    onPopoverChange(match ? popoverAtPointer(event, {
      title: match.item.label,
      color: colors[match.index % colors.length],
      label: `${formatWorkCount(match.item.count)} publications`,
      value: `${Math.round(match.item.count / total * 100)}%`,
    }) : null)
  }

  return <Box
    className={className}
    onMouseMove={handleMouseMove}
    onMouseLeave={() => {
      onHoveredIndexChange(null)
      onPopoverChange(null)
    }}
    role="group"
    aria-label={`${formatWorkCount(total)} publications across ${segments.length} categories`}
  >
    <svg className="donut-svg" viewBox="0 0 100 100">
      {renderSegments.map((segment) => {
        const isActive = segment.index === hoveredIndex
        return <path
          key={segment.item.label}
          className={`donut-segment${isActive ? ' is-active' : ''}`}
          d={donutSegmentPath(segment.start, segment.end)}
          fill={colors[segment.index % colors.length]}
          role="img"
          aria-label={`${segment.item.label}: ${formatWorkCount(segment.item.count)} publications, ${Math.round(segment.item.count / total * 100)}%`}
        />
      })}
    </svg>
    {centerLabel && <Box className="donut-hole" aria-hidden="true">{centerLabel}</Box>}
  </Box>
}

function Legend({ items, colors, hoveredIndex, onHoveredIndexChange, onPopoverChange }: {
  items: DistributionItem[]
  colors: string[]
  hoveredIndex: number | null
  onHoveredIndexChange: (index: number | null) => void
  onPopoverChange: (data: ChartPopoverData | null) => void
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0)

  return <Box className="distribution-legend">
    {items.map((item, index) => {
      const share = total ? Math.round(item.count / total * 100) : 0
      const isActive = hoveredIndex === index
      const details = {
        title: item.label,
        color: colors[index % colors.length],
        label: `${formatWorkCount(item.count)} publications`,
        value: `${share}%`,
      }
      return <Box
        className={`distribution-legend-row${isActive ? ' is-highlighted' : ''}`}
        key={item.label}
        role="img"
        aria-label={`${item.label}: ${formatWorkCount(item.count)} publications (${share}%)`}
        onMouseEnter={(event) => {
          onHoveredIndexChange(index)
          onPopoverChange(popoverAtPointer(event, details))
        }}
        onMouseMove={(event) => onPopoverChange(popoverAtPointer(event, details))}
        onMouseLeave={() => {
          onHoveredIndexChange(null)
          onPopoverChange(null)
        }}
      >
        <span className="distribution-legend-dot" style={{ background: colors[index % colors.length] }} />
        <Typography>{item.label}</Typography>
        <span className="distribution-legend-share">{share}%</span>
      </Box>
    })}
  </Box>
}

function SubjectAreaChart({ items }: { items: DistributionItem[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [popover, setPopover] = useState<ChartPopoverData | null>(null)
  return <>
    <Box className="subject-area-chart">
      <Legend items={items} colors={subjectChartColors} hoveredIndex={hoveredIndex} onHoveredIndexChange={setHoveredIndex} onPopoverChange={setPopover} />
      <Donut items={items} colors={subjectChartColors} className="subject-donut" centerLabel="100%" hoveredIndex={hoveredIndex} onHoveredIndexChange={setHoveredIndex} onPopoverChange={setPopover} />
    </Box>
    <ChartHoverPopover data={popover} />
  </>
}

function PublicationTypeChart({ items }: { items: DistributionItem[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [popover, setPopover] = useState<ChartPopoverData | null>(null)
  return <>
    <Box className="publication-type-chart">
      <Legend items={items} colors={publicationTypeColors} hoveredIndex={hoveredIndex} onHoveredIndexChange={setHoveredIndex} onPopoverChange={setPopover} />
      <Donut items={items} colors={publicationTypeColors} className="publication-type-donut" centerLabel="100%" hoveredIndex={hoveredIndex} onHoveredIndexChange={setHoveredIndex} onPopoverChange={setPopover} />
    </Box>
    <ChartHoverPopover data={popover} />
  </>
}

function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return <Box className="project-empty-state">
    <Box className="project-empty-icon" aria-hidden="true">{icon}</Box>
    <Typography>{title}</Typography>
    <Typography>{description}</Typography>
  </Box>
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return <Box className="project-summary-row">
    <Typography>{label}</Typography>
    <Typography>{value}</Typography>
  </Box>
}

function formatPublicationType(type: string) {
  const label = type.trim().replace(/[-_]+/g, ' ')
  return label ? label.replace(/\b\w/g, (character) => character.toUpperCase()) : 'Publication'
}

function NewsFeedContent({ projectId, topics, projectQuery }: {
  projectId: string
  topics: string[]
  projectQuery: string
}) {
  const pageSize = 10
  const [publicationQuery, setPublicationQuery] = useState('')
  const [publicationYear, setPublicationYear] = useState('All years')
  const [page, setPage] = useState(1)
  const [requestVersion, setRequestVersion] = useState(0)
  const [request, setRequest] = useState<NewsFeedRequest | null>(null)
  const matchedTopics = topics.length ? topics : ['No tracked keywords']
  const query = publicationQuery.trim() || projectQuery
  const requestKey = JSON.stringify([projectId, query, publicationYear, page, requestVersion])
  const activeRequest = request?.key === requestKey ? request : null
  const works = activeRequest?.status === 'success' ? activeRequest.works : []
  const total = activeRequest?.status === 'success' ? activeRequest.total : 0
  const totalPages = activeRequest?.status === 'success'
    ? activeRequest.pagination?.total_pages ?? Math.ceil(total / pageSize)
    : 0
  const loading = activeRequest === null
  const error = activeRequest?.status === 'error' ? activeRequest.message : ''
  const yearOptions = Array.from({ length: 15 }, (_, index) => String(currentPublicationYear - index))

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      getProjectResearchData(
        projectId,
        JSON.stringify(['news-feed', { query, page, limit: pageSize, publicationYear, sortBy: 'publication_year', sortOrder: 'desc' }]),
        (signal) => searchResearch('Works', {
          query,
          page,
          limit: pageSize,
          sortBy: 'publication_year',
          sortOrder: 'desc',
          publication_year: publicationYear === 'All years' ? undefined : publicationYear,
          include_facets: 0,
        }, signal),
        controller.signal,
      )
        .then((result) => setRequest({
          key: requestKey,
          status: 'success',
          works: result.items as WorkerWork[],
          total: result.total,
          pagination: result.pagination,
        }))
        .catch((requestError: unknown) => {
          if (!controller.signal.aborted) {
            setRequest({
              key: requestKey,
              status: 'error',
              message: requestError instanceof Error ? requestError.message : 'Could not load OpenAlex publications.',
            })
          }
        })
    }, 300)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [page, pageSize, projectId, publicationYear, query, requestKey])

  return <Box className="project-tab-content">
    <Box className="project-tab-intro">
      <Typography component="h2" className="project-section-heading">Scientific News Feed</Typography>
      <Box className="project-count-pill" role={loading ? 'status' : undefined} aria-label={loading ? 'Loading article count' : undefined}>
        {loading ? <ProjectInlineSkeleton width={76} height={18} /> : error ? 'Unavailable' : `${formatWorkCount(total)} articles`}
      </Box>
    </Box>
    <Box className="news-feed-grid">
      <Paper variant="outlined" className="news-publications-card">
        <Box className="project-input-frame">
          <InputBase
            value={publicationQuery}
            onChange={(event) => {
              setPublicationQuery(event.target.value)
              setPage(1)
            }}
            placeholder="Search OpenAlex publications..."
            inputProps={{ 'aria-label': 'Search OpenAlex publications' }}
          />
        </Box>
        <Box className="publication-list-heading">
          <Typography>Recent Publications</Typography>
          {loading ? <ProjectInlineSkeleton width={94} height={16} /> : <Typography>{activeRequest?.status === 'success' ? `${works.length} shown · Newest first` : 'Newest first'}</Typography>}
        </Box>
        <Box className="project-publication-list" aria-live="polite">
          {loading ? <ProjectPublicationListSkeleton />
            : error ? <Box className="project-feed-error" role="alert">
              <Typography>{error}</Typography>
              <Button size="small" variant="outlined" onClick={() => setRequestVersion((version) => version + 1)}>Retry</Button>
            </Box>
              : works.length ? works.map((work) => {
                const authors = work.authors.map((author) => author.name).filter(Boolean).slice(0, 3).join(', ')
                const details = [authors, work.journal_name].filter(Boolean).join(' · ')
                const workType = formatPublicationType(work.type)
                return <Box className="project-publication" key={work.id}>
                  <Box className="project-publication-meta">
                    <Typography>{workType}</Typography>
                    <Typography>{work.publication_year ?? 'Year unavailable'}</Typography>
                  </Box>
                  <Typography component="h3">{work.title || 'Untitled publication'}</Typography>
                  {details && <Typography className="project-publication-details">{details}</Typography>}
                  {work.subject_area?.name && <Box className="project-topic-pill">{work.subject_area.name}</Box>}
                </Box>
              }) : <Box className="project-list-empty">No OpenAlex publications match this search.</Box>}
        </Box>
        <Box className="publication-pagination">
          {loading ? <ProjectInlineSkeleton width={82} height={16} /> : <Typography>{totalPages ? `Page ${page} of ${totalPages}` : 'No pages'}</Typography>}
          <Box>
            <Button size="small" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
            <Button size="small" disabled={!totalPages || page >= totalPages || loading} onClick={() => setPage((current) => current + 1)}>Next</Button>
          </Box>
        </Box>
      </Paper>

      <Paper variant="outlined" className="news-filter-card">
        <Typography component="h3">Filter Panel</Typography>
        <Typography className="news-filter-label">Publication year</Typography>
        <Select
          value={publicationYear}
          onChange={(event) => {
            setPublicationYear(event.target.value)
            setPage(1)
          }}
          size="small"
          className="publication-year-select"
          inputProps={{ 'aria-label': 'Publication year' }}
        >
          {['All years', ...yearOptions].map((year) => <MenuItem value={year} key={year}>{year}</MenuItem>)}
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
  projectId,
  subject,
  trackedTopics,
  visibleTopics,
  topicQuery,
  onTopicQueryChange,
  onAddTopic,
  onRemoveTopic,
  topicsSaving,
  topicsSaveError,
}: {
  projectId: string
  subject: string
  trackedTopics: string[]
  visibleTopics: string[]
  topicQuery: string
  onTopicQueryChange: (value: string) => void
  onAddTopic: (topic: string) => void
  onRemoveTopic: (topic: string) => void
  topicsSaving: boolean
  topicsSaveError: string
}) {
  const [results, setResults] = useState<Record<string, KeywordMonitoringRequest>>({})
  const [retryVersion, setRetryVersion] = useState(0)
  const [keywordSearchVersion, setKeywordSearchVersion] = useState(0)
  const [keywordQuery, setKeywordQuery] = useState('')
  const [isKeywordSuggestionsOpen, setIsKeywordSuggestionsOpen] = useState(false)
  const [keywordSearchAnchor, setKeywordSearchAnchor] = useState<HTMLDivElement | null>(null)
  const [keywordSearchAnchorWidth, setKeywordSearchAnchorWidth] = useState(0)
  const [keywordSuggestionRequest, setKeywordSuggestionRequest] = useState<KeywordSuggestionsRequest | null>(null)
  const keywordSearch = keywordQuery.trim() || subject
  const keywordSearchKey = JSON.stringify([keywordSearch, keywordSearchVersion])
  const activeKeywordSuggestionRequest = keywordSuggestionRequest?.key === keywordSearchKey ? keywordSuggestionRequest : null
  const keywordSuggestions = activeKeywordSuggestionRequest?.status === 'success' ? activeKeywordSuggestionRequest.items : []
  const keywordSearchLoading = Boolean(keywordSearch) && activeKeywordSuggestionRequest === null
  const uniqueTopics = useMemo(() => Array.from(new Set(trackedTopics.map((topic) => topic.trim()).filter(Boolean))), [trackedTopics])
  const trackedKeywordNames = useMemo(() => new Set(uniqueTopics.map((topic) => topic.toLocaleLowerCase())), [uniqueTopics])

  useEffect(() => {
    if (!keywordSearchAnchor) return

    const resizeObserver = new ResizeObserver(([entry]) => {
      setKeywordSearchAnchorWidth(entry.contentRect.width)
    })
    resizeObserver.observe(keywordSearchAnchor)
    return () => resizeObserver.disconnect()
  }, [keywordSearchAnchor])

  useEffect(() => {
    if (!isKeywordSuggestionsOpen || !keywordSearch || keywordSuggestionRequest?.key === keywordSearchKey) return

    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      getProjectResearchData(
        projectId,
        JSON.stringify(['keyword-suggestions', keywordSearch.trim().toLocaleLowerCase()]),
        (signal) => searchKeywords(keywordSearch, signal),
        controller.signal,
      )
        .then((items) => {
          if (!controller.signal.aborted) setKeywordSuggestionRequest({ key: keywordSearchKey, status: 'success', items })
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) {
            setKeywordSuggestionRequest({
              key: keywordSearchKey,
              status: 'error',
              message: error instanceof Error ? error.message : 'Could not search OpenAlex keywords.',
            })
          }
        })
    }, 250)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [isKeywordSuggestionsOpen, keywordSearch, keywordSearchKey, keywordSuggestionRequest?.key, projectId])

  useEffect(() => {
    const controller = new AbortController()
    let nextTopicIndex = 0

    const loadNextTopic = async () => {
      while (!controller.signal.aborted) {
        const topic = uniqueTopics[nextTopicIndex]
        nextTopicIndex += 1
        if (!topic) return

        try {
          const data = await getKeywordMonitoringResult(projectId, topic, controller.signal)
          if (!controller.signal.aborted) setResults((current) => ({ ...current, [topic]: { status: 'success', data } }))
        } catch (error: unknown) {
          if (!controller.signal.aborted) {
            setResults((current) => ({
              ...current,
              [topic]: { status: 'error', message: error instanceof Error ? error.message : 'Could not load OpenAlex publications.' },
            }))
          }
        }
      }
    }

    void Promise.all(Array.from({ length: Math.min(3, uniqueTopics.length) }, () => loadNextTopic()))
    return () => controller.abort()
  }, [projectId, retryVersion, uniqueTopics])

  return <Box className="project-tab-content">
    <Box className="project-tab-intro">
      <Typography component="h2" className="project-section-heading">Keywords &amp; Monitoring</Typography>
      <Box className="project-count-pill">{trackedTopics.length} tracked</Box>
    </Box>
    <Box className="keyword-monitoring-grid">
      <Paper variant="outlined" className="watchlist-card">
        <Typography component="h3">Watchlist</Typography>
        {topicsSaveError && <Typography className="data-status-error" role="alert">{topicsSaveError}</Typography>}
        <Box className="keyword-search">
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
            <IconButton aria-label={`Remove ${topic}`} size="small" onClick={() => onRemoveTopic(topic)} disabled={topicsSaving}>
              <XMarkIcon width={14} height={14} />
            </IconButton>
          </Box>) : <Typography className="project-list-empty">No tracked keywords found.</Typography>}
        </Box>
        <ClickAwayListener onClickAway={() => setIsKeywordSuggestionsOpen(false)}>
          <Box>
            <Box className="keyword-search" ref={setKeywordSearchAnchor}>
              <InputBase
                value={keywordQuery}
                onChange={(event) => { setKeywordQuery(event.target.value); setIsKeywordSuggestionsOpen(true) }}
                onFocus={() => setIsKeywordSuggestionsOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setIsKeywordSuggestionsOpen(false)
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    const firstAvailable = keywordSuggestions.find((keyword) => !trackedKeywordNames.has((keyword.display_name || keyword.name).toLocaleLowerCase()))
                    if (firstAvailable) onAddTopic(firstAvailable.display_name || firstAvailable.name)
                  }
                }}
                placeholder="Search keywords..."
                inputProps={{ 'aria-label': 'Search OpenAlex keyword suggestions', 'aria-expanded': isKeywordSuggestionsOpen }}
              />
            </Box>
            <Popper
              open={isKeywordSuggestionsOpen && Boolean(keywordSearch)}
              anchorEl={keywordSearchAnchor}
              placement="bottom-start"
              className="keyword-suggestion-popper"
              style={{ width: keywordSearchAnchorWidth }}
            >
              <Paper variant="outlined" className="keyword-suggestion-paper">
                <Box className="keyword-list-header">
                  <Typography>SUGGESTED KEYWORDS</Typography>
                  {keywordSearchLoading ? <ProjectInlineSkeleton width={54} height={16} /> : <Typography>{activeKeywordSuggestionRequest?.status === 'error' ? 'Unavailable' : `${keywordSuggestions.length} results`}</Typography>}
                </Box>
                <Box className="keyword-suggestion-list keyword-list" aria-label="Suggested keywords">
                  {keywordSearchLoading ? <ProjectKeywordRowsSkeleton rows={5} />
                    : activeKeywordSuggestionRequest?.status === 'error' ? <Typography className="no-keywords data-status-error" role="alert">
                      {activeKeywordSuggestionRequest.message}{' '}
                      <Button size="small" onClick={() => setKeywordSearchVersion((version) => version + 1)}>Retry</Button>
                    </Typography>
                      : keywordSuggestions.length ? keywordSuggestions.map((keyword) => {
                        const name = keyword.display_name || keyword.name
                        const selected = trackedKeywordNames.has(name.toLocaleLowerCase())
                        return <Box className="keyword-row" key={keyword.id || name}>
                          <Typography>{name}</Typography>
                          <IconButton
                            onClick={() => onAddTopic(name)}
                            aria-label={selected ? `${name} is already tracked` : `Add ${name} to watchlist`}
                            disabled={selected || topicsSaving}
                            size="small"
                            className={selected ? 'keyword-add is-selected' : 'keyword-add'}
                          >
                            {selected ? <CheckIcon width={17} height={17} /> : <PlusIcon width={17} height={17} />}
                          </IconButton>
                        </Box>
                      }) : <Typography className="no-keywords">No suggested keywords match your search.</Typography>}
                </Box>
              </Paper>
            </Popper>
          </Box>
        </ClickAwayListener>
      </Paper>

      <Paper variant="outlined" className="keyword-results-card">
        <Typography component="h3">Keyword Monitoring Results</Typography>
        <Typography className="project-card-description">Publication activity associated with the tracked keywords</Typography>
        <Box className="keyword-result-list">
          {uniqueTopics.length ? uniqueTopics.map((topic) => {
            const result = results[topic]
            const isLoading = !result
            return <Box className="keyword-result-row" key={topic}>
              <Typography>{topic}</Typography>
              {isLoading ? <Box className="keyword-result-status" role="status" aria-label={`Loading matches for ${topic}`}><ProjectInlineSkeleton width={72} height={16} /></Box>
                : result.status === 'error' ? <Box className="keyword-result-error" role="alert">
                  <Typography className="keyword-result-status">Unavailable</Typography>
                  <Button size="small" variant="outlined" onClick={() => setRetryVersion((version) => version + 1)}>Retry</Button>
                </Box>
                  : <Typography className="keyword-result-status">{formatKeywordMatchCount(result.data.total)} matches</Typography>}
            </Box>
          }) : <Box className="project-list-empty">Add a keyword to start monitoring publications.</Box>}
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
