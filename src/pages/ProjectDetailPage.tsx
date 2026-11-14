import { useMemo, useState, type ReactNode } from 'react'
import { Box, Button, ButtonBase, IconButton, InputBase, MenuItem, Paper, Select, Typography } from '@mui/material'
import {
  ChartBarIcon,
  ClockIcon,
  Cog6ToothIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import type { LocalProject, ProjectTab } from '../types/project'

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

export function ProjectDetailPage({ project, activeTab, onTabChange }: ProjectDetailPageProps) {
  const [publicationQuery, setPublicationQuery] = useState('')
  const [publicationYear, setPublicationYear] = useState('All years')
  const [trackedTopics, setTrackedTopics] = useState(project.topics)
  const [topicQuery, setTopicQuery] = useState('')
  const [newTopic, setNewTopic] = useState('')
  const [memberQuery, setMemberQuery] = useState('')

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

      {activeTab === 'overview' && <OverviewContent topics={trackedTopics} />}
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

function OverviewContent({ topics }: { topics: string[] }) {
  const metrics = [
    { label: 'Related articles', value: '0' },
    { label: 'Growth rate', value: '—' },
    { label: 'Tracked keywords', value: String(topics.length) },
    { label: 'New alerts / 24h', value: '0' },
  ]

  return <Box className="project-overview-content">
    <Typography component="h2" className="project-section-heading">Project Overview</Typography>
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
        <EmptyState
          icon={<ChartBarIcon width={25} height={25} />}
          title="Waiting for publication data"
          description="Related publication trends will appear here."
        />
      </Paper>
      <Paper variant="outlined" className="project-chart-card subject-distribution-card">
        <Typography component="h3">Subject Area Distribution</Typography>
        <Typography className="project-card-description">Publications by research field</Typography>
        <EmptyState
          icon={<ClockIcon width={23} height={23} />}
          title="No distribution data"
          description="Subject area breakdown will appear here."
        />
      </Paper>
    </Box>
    <Box className="project-summary-grid">
      <Paper variant="outlined" className="project-chart-card publication-type-card">
        <Typography component="h3">Publication Type Distribution</Typography>
        <Typography className="project-card-description">Journal, conference and other sources</Typography>
        <EmptyState
          icon={<ChartBarIcon width={24} height={24} />}
          title="No publication data"
          description="Publication type trends will appear here."
        />
      </Paper>
      <Paper variant="outlined" className="project-chart-card monitoring-summary-card">
        <Typography component="h3">Monitoring Summary</Typography>
        <SummaryRow label="Total journals" value="0" />
        <SummaryRow label="Last updated" value="Not available" />
        <SummaryRow label="New alerts" value="0" />
      </Paper>
    </Box>
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
