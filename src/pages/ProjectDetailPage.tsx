import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Box, Button, ButtonBase, CircularProgress, IconButton, InputBase, MenuItem, Paper, Select, Typography } from '@mui/material'
import {
  ChartBarIcon,
  ClockIcon,
  Cog6ToothIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import type { LocalProject, ProjectTab } from '../types/project'
import { searchResearch, type WorkerFacet, type WorkerWork } from '../services/workerApi'

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
  sourceCount: number
  sampleSize: number
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
  return { query, includedTopicCount: included.length, totalTopicCount: terms.length }
}

function buildProjectOverview(
  totalWorks: number,
  facets: Record<string, WorkerFacet[]>,
  items: WorkerWork[],
): ProjectOverviewData {
  const currentYear = new Date().getFullYear()
  const yearCounts = (facets.publication_year ?? [])
    .map((facet) => ({ year: Number(facet.value), count: facet.count }))
    .filter((item) => Number.isInteger(item.year) && item.year >= 1900 && item.year <= currentYear)
    .sort((left, right) => left.year - right.year)
  const years = yearCounts.slice(-5)
  const previousYearCount = yearCounts.find((item) => item.year === currentYear - 2)?.count
  const latestCompleteYearCount = yearCounts.find((item) => item.year === currentYear - 1)?.count
  const growthRate = previousYearCount && latestCompleteYearCount !== undefined
    ? ((latestCompleteYearCount - previousYearCount) / previousYearCount) * 100
    : null

  const subjectCounts = new Map<string, number>()
  const sourceNames = new Set<string>()
  for (const work of items) {
    const subject = work.subject_area?.name?.trim()
    if (subject) subjectCounts.set(subject, (subjectCounts.get(subject) ?? 0) + 1)
    if (work.journal_name) sourceNames.add(work.journal_name)
  }

  return {
    totalWorks,
    years,
    types: (facets.type ?? []).slice(0, 5).map((facet) => ({ label: facet.label, count: facet.count })),
    subjects: [...subjectCounts].map(([label, count]) => ({ label, count })).sort((left, right) => right.count - left.count).slice(0, 5),
    sourceCount: sourceNames.size,
    sampleSize: items.length,
    growthRate,
    updatedAt: new Date().toISOString(),
  }
}

export function ProjectDetailPage({ project, activeTab, onTabChange }: ProjectDetailPageProps) {
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
    searchResearch('Works', {
      query: projectSearch.query,
      page: 1,
      limit: 100,
      sortBy: 'publication_year',
      sortOrder: 'desc',
      include_facets: 1,
    }, controller.signal)
      .then((result) => {
        setOverviewRequest({
          key: overviewRequestKey,
          status: 'success',
          data: buildProjectOverview(result.total, result.facets, result.items as WorkerWork[]),
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

      <Box component="nav" className="project-detail-tabs" aria-label="Project sections">
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
        includedTopicCount={projectSearch.includedTopicCount}
        totalTopicCount={projectSearch.totalTopicCount}
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
  includedTopicCount,
  totalTopicCount,
  onRetry,
}: {
  topics: string[]
  data: ProjectOverviewData | null
  loading: boolean
  error: string
  includedTopicCount: number
  totalTopicCount: number
  onRetry: () => void
}) {
  const growthRate = data?.growthRate
  const metrics = [
    { label: 'Related articles', value: loading ? '…' : error ? '—' : data ? formatWorkCount(data.totalWorks) : '0' },
    { label: 'Growth rate', value: loading ? '…' : growthRate === null || growthRate === undefined ? '—' : `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%` },
    { label: 'Tracked keywords', value: String(topics.length) },
    { label: 'New alerts / 24h', value: '—' },
  ]

  return <Box className="project-overview-content">
    <Box className="project-overview-heading">
      <Typography component="h2" className="project-section-heading">Project Overview</Typography>
      <Typography className="project-data-source">
        {loading
          ? 'Loading OpenAlex data…'
          : error
            ? 'OpenAlex data unavailable'
            : totalTopicCount === 0
              ? 'OpenAlex · searching by subject area'
              : `OpenAlex · searching ${includedTopicCount} of ${totalTopicCount} project keywords`}
      </Typography>
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
        <Typography className="project-card-description">Annual works matching this project’s keywords</Typography>
        {loading
          ? <OverviewLoadingState />
          : error
            ? <OverviewErrorState message={error} onRetry={onRetry} />
            : data?.years.length
              ? <PublicationTrendChart years={data.years} />
              : <EmptyState icon={<ChartBarIcon width={25} height={25} />} title="No matching publications" description="Try broader project keywords." />}
      </Paper>
      <Paper variant="outlined" className="project-chart-card subject-distribution-card">
        <Typography component="h3">Subject Area Distribution</Typography>
        <Typography className="project-card-description">Top areas in the returned works sample</Typography>
        {loading
          ? <OverviewLoadingState />
          : error
            ? <EmptyState icon={<ClockIcon width={23} height={23} />} title="Distribution unavailable" description="Retry the OpenAlex search to load this chart." />
            : data?.subjects.length
              ? <SubjectAreaChart items={data.subjects} sampleSize={data.subjects.reduce((sum, item) => sum + item.count, 0)} />
              : <EmptyState icon={<ClockIcon width={23} height={23} />} title="No subject data" description="OpenAlex did not return subject areas for this sample." />}
      </Paper>
    </Box>
    <Box className="project-summary-grid">
      <Paper variant="outlined" className="project-chart-card publication-type-card">
        <Typography component="h3">Publication Type Distribution</Typography>
        <Typography className="project-card-description">Works matching this project’s keywords</Typography>
        {loading
          ? <OverviewLoadingState />
          : error
            ? <EmptyState icon={<ChartBarIcon width={24} height={24} />} title="Type data unavailable" description="Retry the OpenAlex search to load this chart." />
            : data?.types.length
              ? <DistributionBars items={data.types} />
              : <EmptyState icon={<ChartBarIcon width={24} height={24} />} title="No publication data" description="No matching works were returned." />}
      </Paper>
      <Paper variant="outlined" className="project-chart-card monitoring-summary-card">
        <Typography component="h3">Monitoring Summary</Typography>
        <SummaryRow label="Unique journals in sample" value={loading ? '…' : error ? '—' : String(data?.sourceCount ?? 0)} />
        <SummaryRow label="Works in sample" value={loading ? '…' : error ? '—' : String(data?.sampleSize ?? 0)} />
        <SummaryRow label="Data fetched" value={loading ? '…' : error ? '—' : data ? new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} />
        <SummaryRow label="Alerts" value="Not enabled" />
      </Paper>
    </Box>
  </Box>
}

function formatWorkCount(count: number) {
  return count >= 10_000 ? `${new Intl.NumberFormat('en-US').format(count)}+` : new Intl.NumberFormat('en-US').format(count)
}

function OverviewLoadingState() {
  return <Box className="project-overview-loading" role="status">
    <CircularProgress size={18} />
    <Typography>Loading OpenAlex results…</Typography>
  </Box>
}

function OverviewErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <Box className="project-overview-error" role="alert">
    <Typography>{message}</Typography>
    <Button size="small" variant="outlined" onClick={onRetry}>Retry</Button>
  </Box>
}

function PublicationTrendChart({ years }: { years: ProjectOverviewData['years'] }) {
  const width = 640
  const height = 150
  const maxCount = Math.max(...years.map((item) => item.count), 1)
  const points = years.map((item, index) => ({
    ...item,
    x: years.length === 1 ? width / 2 : 24 + (index / (years.length - 1)) * (width - 48),
    y: height - 20 - (item.count / maxCount) * (height - 44),
  }))

  return <Box className="publication-trend-chart">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Publication counts by year">
      {[0, 1, 2, 3].map((line) => {
        const y = 14 + (line / 3) * (height - 34)
        return <line key={line} x1="18" x2={width - 18} y1={y} y2={y} className="publication-trend-gridline" />
      })}
      <polyline points={points.map((point) => `${point.x},${point.y}`).join(' ')} className="publication-trend-line" />
      {points.map((point) => <circle key={point.year} cx={point.x} cy={point.y} r="4" className="publication-trend-point"><title>{`${point.year}: ${new Intl.NumberFormat('en-US').format(point.count)} works`}</title></circle>)}
    </svg>
    <Box className="publication-trend-years">
      {points.map((point) => <Typography key={point.year}>{point.year}</Typography>)}
    </Box>
  </Box>
}

const subjectChartColors = ['#0879c9', '#50a5dc', '#44a276', '#e7a43b', '#8a75c4']

function SubjectAreaChart({ items, sampleSize }: { items: DistributionItem[]; sampleSize: number }) {
  const total = items.reduce((sum, item) => sum + item.count, 0)
  const colorStops = items.map((item, index) => {
    const precedingCount = items.slice(0, index).reduce((sum, precedingItem) => sum + precedingItem.count, 0)
    const start = total ? (precedingCount / total) * 100 : 0
    const end = total ? ((precedingCount + item.count) / total) * 100 : 100
    return `${subjectChartColors[index % subjectChartColors.length]} ${start}% ${end}%`
  })
  const chartStyle = { background: `conic-gradient(${colorStops.join(', ')})` }

  return <Box className="subject-area-chart">
    <Box className="subject-donut" style={chartStyle} role="img" aria-label={`Subject areas across ${sampleSize} returned works`}>
      <Box className="subject-donut-center"><strong>{sampleSize}</strong><span>works</span></Box>
    </Box>
    <Box className="subject-area-legend">
      {items.map((item, index) => <Box className="subject-area-legend-item" key={item.label}>
        <span style={{ background: subjectChartColors[index % subjectChartColors.length] }} />
        <Typography title={item.label}>{item.label}</Typography>
        <strong>{item.count}</strong>
      </Box>)}
    </Box>
  </Box>
}

function DistributionBars({ items }: { items: DistributionItem[] }) {
  const maxCount = Math.max(...items.map((item) => item.count), 1)
  return <Box className="project-distribution-bars">
    {items.map((item) => <Box className="project-distribution-item" key={item.label}>
      <Box className="project-distribution-label">
        <Typography title={item.label}>{item.label.replace(/[-_]/g, ' ')}</Typography>
        <strong>{new Intl.NumberFormat('en-US').format(item.count)}</strong>
      </Box>
      <Box className="project-distribution-track"><span style={{ width: `${Math.max(3, (item.count / maxCount) * 100)}%` }} /></Box>
    </Box>)}
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
