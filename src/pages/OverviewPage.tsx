import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Box, Button, Checkbox, FormControl, IconButton, InputBase, MenuItem, Paper, Select, Tooltip, Typography } from '@mui/material'
import { ArrowDownTrayIcon, BuildingOffice2Icon, DocumentTextIcon, EllipsisVerticalIcon, MagnifyingGlassIcon, UserIcon } from '@heroicons/react/24/outline'
import {
  getCountries,
  getInstitutionOptions,
  searchResearch,
  type ResearchEntity,
  type ResearchSearchParams,
  type WorkerAuthor,
  type WorkerCountry,
  type WorkerFacet,
  type WorkerInstitution,
  type WorkerWork,
} from '../services/workerApi'

type RecordItem = {
  id: string
  title: string
  organization: string
  description: string
  count: string
  countLabel: string
}

type FilterOption = { label: string; value: string; count: string }
type FilterGroup = { title: string; key: string; options: FilterOption[] }
type QuickFilterOption = { label: string; value: string }
type FacetState = { key: string; facets: Record<string, WorkerFacet[]> }

const emptyFacets: Record<string, WorkerFacet[]> = {}

const entityIcons = { Authors: UserIcon, Works: DocumentTextIcon, Institutions: BuildingOffice2Icon }
const defaultSort: Record<ResearchEntity, string> = {
  Authors: 'works_count',
  Works: 'cited_by_count',
  Institutions: 'works_count',
}

function formatCount(value: number) {
  return Number(value || 0).toLocaleString('en-US')
}

function titleCase(value: string) {
  return value.split(/[\s_-]+/).filter(Boolean).map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ')
}

function selectedValues(filters: Set<string>, key: string) {
  const prefix = `${key}:`
  return [...filters].filter((item) => item.startsWith(prefix)).map((item) => item.slice(prefix.length))
}

function mergeFilterValues(...values: (string | undefined)[]) {
  return [...new Set(values.flatMap((value) => value ? value.split('|').filter(Boolean) : []))].join('|') || undefined
}

function makeFilterGroups(entity: ResearchEntity, facets: Record<string, WorkerFacet[]>): FilterGroup[] {
  const definitions: Record<ResearchEntity, { title: string; key: string }[]> = {
    Authors: [
      { title: 'Exact Institution', key: 'institution_id' },
      { title: 'Institution Country', key: 'country_code' },
      { title: 'Has ORCID', key: 'has_orcid' },
    ],
    Works: [
      { title: 'Publication year', key: 'publication_year' },
      { title: 'Work type', key: 'type' },
      { title: 'Open access', key: 'is_open_access' },
    ],
    Institutions: [
      { title: 'Institution Country', key: 'country_code' },
      { title: 'Institution type', key: 'type' },
    ],
  }

  return definitions[entity].map(({ title, key }) => {
    const options = (facets[key] ?? []).map((option) => ({
      label: key === 'has_orcid' || key === 'is_open_access'
        ? option.value === 'true' ? 'Yes' : 'No'
        : key === 'type' ? titleCase(option.label) : option.label,
      value: option.value,
      count: formatCount(option.count),
    }))
    if (key === 'publication_year') options.sort((left, right) => Number(right.value) - Number(left.value))
    return { title, key, options }
  })
}

function mapAuthors(authors: WorkerAuthor[]): RecordItem[] {
  return authors.map((author) => ({
    id: author.id,
    title: author.name,
    organization: author.institution_1 || author.institution_2 || '',
    description: author.subject_areas.slice(0, 2).join(' \u00b7 '),
    count: formatCount(author.works_count),
    countLabel: 'Works',
  }))
}

function mapWorks(works: WorkerWork[]): RecordItem[] {
  return works.map((work) => ({
    id: work.id,
    title: work.title || 'Untitled work',
    organization: work.journal_name || String(work.publication_year ?? ''),
    description: [work.authors.slice(0, 2).map((author) => author.name).filter(Boolean).join(', '), work.subject_area?.name]
      .filter(Boolean).join(' \u00b7 '),
    count: formatCount(work.citation_count),
    countLabel: 'Citations',
  }))
}

function mapInstitutions(institutions: WorkerInstitution[], countries: WorkerCountry[]): RecordItem[] {
  return institutions.map((institution) => {
    const country = countries.find((item) => item.zone_id === institution.country_code)?.name || institution.country_code
    return {
      id: institution.id,
      title: institution.name,
      organization: country,
      description: [institution.type, institution.city, institution.region].filter(Boolean).join(' \u00b7 '),
      count: formatCount(institution.works_count),
      countLabel: 'Works',
    }
  })
}

function EntitySelect({ value, onChange }: { value: ResearchEntity; onChange: (value: ResearchEntity) => void }) {
  return <FormControl variant="standard" className="entity-select">
    <Select value={value} onChange={(event) => onChange(event.target.value as ResearchEntity)} input={<InputBase />} inputProps={{ 'aria-label': 'Search category' }}>
      {(['Authors', 'Works', 'Institutions'] as ResearchEntity[]).map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
    </Select>
  </FormControl>
}

function QuickFilter({ value, label, options, onChange, disabled }: {
  value: string
  label: string
  options: QuickFilterOption[]
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const selectedLabel = options.find((option) => option.value === value)?.label
  return <Box className="quick-filter-chip">
    <FormControl variant="standard" className="quick-filter">
      <Select
        displayEmpty
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        input={<InputBase />}
        renderValue={(selected) => selected ? selectedLabel ?? label : label}
        inputProps={{ 'aria-label': `${label} filter` }}
        MenuProps={{ slotProps: { paper: { sx: { border: '1px solid #e2e5e9', boxShadow: '0 8px 24px rgba(23,26,30,.1)' } } } }}
      >
        <MenuItem value="">Any {label.toLowerCase()}</MenuItem>
        {options.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
      </Select>
    </FormControl>
  </Box>
}

function FilterCard({ group, selected, onToggle, loading, error }: {
  group: FilterGroup
  selected: Set<string>
  onToggle: (key: string, value: string) => void
  loading: boolean
  error: boolean
}) {
  return <Paper variant="outlined" className="filter-card">
    <Box className="filter-card-title-row">
      <Typography component="h3">{group.title}</Typography>
      <Tooltip title={`${group.title} options`}>
        <IconButton size="small" aria-label={`${group.title} options`} className="quiet-icon-button"><EllipsisVerticalIcon width={16} height={16} /></IconButton>
      </Tooltip>
    </Box>
    <Box className="filter-card-divider" />
    <Box className="filter-options">
      {loading ? <Typography className="filter-status">Loading filters...</Typography>
        : error ? <Typography className="filter-status" role="status">Filters unavailable.</Typography>
          : group.options.length === 0 ? <Typography className="filter-status">No options for this search.</Typography>
            : group.options.map((option) => {
        const key = `${group.key}:${option.value}`
        return <label className="filter-option" key={key}>
          <Checkbox size="small" checked={selected.has(key)} onChange={() => onToggle(group.key, option.value)} slotProps={{ input: { 'aria-label': option.label } }} sx={{ p: 0, color: '#727a83', '&.Mui-checked': { color: '#0879c9' } }} />
          <span className="filter-option-label">{option.label}</span>
          <span className="filter-option-count">{option.count}</span>
        </label>
      })}
    </Box>
  </Paper>
}

function exportCsv(records: RecordItem[], entity: ResearchEntity) {
  const rows = [['Name', 'Organization', 'Description', 'Metric'], ...records.map((record) => [record.title, record.organization, record.description, `${record.count} ${record.countLabel}`])]
  const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `sjs-${entity.toLowerCase()}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function OverviewPage() {
  const [entity, setEntity] = useState<ResearchEntity>('Authors')
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [requestVersion, setRequestVersion] = useState(0)
  const [institution, setInstitution] = useState('')
  const [country, setCountry] = useState('')
  const [sortBy, setSortBy] = useState(defaultSort.Authors)
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set())
  const [records, setRecords] = useState<RecordItem[]>([])
  const [total, setTotal] = useState(0)
  const [completedRequestKey, setCompletedRequestKey] = useState('')
  const [searchFailure, setSearchFailure] = useState<{ key: string; message: string } | null>(null)
  const [countries, setCountries] = useState<WorkerCountry[]>([])
  const [institutions, setInstitutions] = useState<WorkerInstitution[]>([])
  const [catalogOptionsLoading, setCatalogOptionsLoading] = useState(true)
  const [facetState, setFacetState] = useState<FacetState>({ key: '', facets: emptyFacets })
  const facetCache = useRef<FacetState | null>(null)

  const countryOptions = useMemo(() => countries.map((item) => ({ label: item.name, value: item.zone_id })), [countries])
  const institutionOptions = useMemo(() => institutions.map((item) => ({ label: item.name, value: item.id })), [institutions])
  const facetKey = JSON.stringify([entity, submittedQuery])
  const visibleFacets = facetState.key === facetKey ? facetState.facets : emptyFacets
  const filterGroups = useMemo(() => makeFilterGroups(entity, visibleFacets), [entity, visibleFacets])
  const requestKey = JSON.stringify({
    query: submittedQuery,
    requestVersion,
    entity,
    sortBy,
    institution,
    country,
    filters: [...selectedFilters].sort(),
    countries: countries.map(({ zone_id, name }) => [zone_id, name]),
  })
  const searchError = searchFailure?.key === requestKey ? searchFailure.message : ''
  const loading = Boolean(submittedQuery) && completedRequestKey !== requestKey && !searchError
  const filterGroupsLoading = Boolean(submittedQuery) && facetState.key !== facetKey && !searchError
  const sortOptions = entity === 'Works'
    ? [{ value: 'cited_by_count', label: 'Most citations' }, { value: 'publication_year', label: 'Most recent' }, { value: 'title', label: 'Title' }]
    : [{ value: 'works_count', label: 'Most works' }, { value: 'cited_by_count', label: 'Most citations' }]

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getCountries(controller.signal), getInstitutionOptions(controller.signal)])
      .then(([countryItems, institutionItems]) => {
        setCountries(countryItems.sort((left, right) => left.name.localeCompare(right.name)))
        setInstitutions(institutionItems as WorkerInstitution[])
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setCountries([])
          setInstitutions([])
        }
      })
      .finally(() => { if (!controller.signal.aborted) setCatalogOptionsLoading(false) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!submittedQuery) return
    const controller = new AbortController()
    const cachedFacets = facetCache.current?.key === facetKey
    const institutionFilter = entity === 'Institutions' ? undefined : mergeFilterValues(institution, selectedValues(selectedFilters, 'institution_id').join('|'))
    const countryFilter = mergeFilterValues(country, selectedValues(selectedFilters, 'country_code').join('|'))
    const params: ResearchSearchParams = {
      query: submittedQuery,
      page: 1,
      limit: 5,
      sortBy,
      sortOrder: 'desc',
      institution_id: institutionFilter,
      country_code: countryFilter,
      has_orcid: entity === 'Authors' ? selectedValues(selectedFilters, 'has_orcid').join('|') : undefined,
      publication_year: entity === 'Works' ? selectedValues(selectedFilters, 'publication_year').join('|') : undefined,
      type: entity === 'Institutions' || entity === 'Works' ? selectedValues(selectedFilters, 'type').join('|') : undefined,
      is_open_access: entity === 'Works' ? selectedValues(selectedFilters, 'is_open_access').join('|') : undefined,
      include_facets: cachedFacets ? 0 : 1,
    }

    searchResearch(entity, params, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        if (entity === 'Authors') setRecords(mapAuthors(result.items as WorkerAuthor[]))
        else if (entity === 'Works') setRecords(mapWorks(result.items as WorkerWork[]))
        else setRecords(mapInstitutions(result.items as WorkerInstitution[], countries))
        if (!cachedFacets) {
          const nextFacetState = { key: facetKey, facets: result.facets ?? emptyFacets }
          facetCache.current = nextFacetState
          setFacetState(nextFacetState)
        }
        setTotal(result.total)
        setCompletedRequestKey(requestKey)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setSearchFailure({ key: requestKey, message: error instanceof Error ? error.message : 'Unable to load search results.' })
      })
    return () => controller.abort()
  }, [submittedQuery, requestVersion, entity, sortBy, institution, country, selectedFilters, countries, requestKey, facetKey])

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return
    setSubmittedQuery(trimmedQuery)
    setRequestVersion((version) => version + 1)
    setSelectedFilters(new Set())
  }

  const changeEntity = (nextEntity: ResearchEntity) => {
    setEntity(nextEntity)
    setSortBy(defaultSort[nextEntity])
    setSelectedFilters(new Set())
  }

  const toggleFilter = (key: string, value: string) => setSelectedFilters((current) => {
    const next = new Set(current)
    const item = `${key}:${value}`
    if (next.has(item)) next.delete(item)
    else next.add(item)
    return next
  })

  const EntityIcon = entityIcons[entity]
  const showingCount = Math.min(5, total || records.length)

  return <Box className={`overview-page${submittedQuery ? ' has-results' : ''}`}>
    <Box className="overview-controls">
      <Box className="search-page-heading"><Typography component="h1">Time to search something great.</Typography></Box>
      <Box component="form" className="research-search" onSubmit={submitSearch}>
        <EntitySelect value={entity} onChange={changeEntity} />
        <InputBase className="research-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" inputProps={{ 'aria-label': 'Search scientific research', required: true }} />
        <Tooltip title="Search options"><IconButton type="button" aria-label="Search options" className="query-more-button"><EllipsisVerticalIcon width={18} height={18} /></IconButton></Tooltip>
        <Tooltip title="Search"><IconButton type="submit" aria-label="Search" className="query-submit-button"><MagnifyingGlassIcon width={18} height={18} /></IconButton></Tooltip>
      </Box>
      <Box className="quick-filters">
        <QuickFilter value={institution} onChange={setInstitution} label="Institution" options={institutionOptions} disabled={catalogOptionsLoading || entity === 'Institutions'} />
        <QuickFilter value={country} onChange={setCountry} label="Country" options={countryOptions} disabled={catalogOptionsLoading} />
        <Button className="more-filters-button" type="button">More filters</Button>
      </Box>
    </Box>

    {!submittedQuery ? <Paper variant="outlined" className="search-empty-state">
      <Box className="search-empty-icon"><MagnifyingGlassIcon aria-hidden="true" /></Box>
      <Typography component="h2">Discover scientific research</Typography>
      <Typography className="search-empty-description">Enter a query or choose a research category to start exploring OpenAlex.</Typography>
      <Box className="suggested-entities">{(['Authors', 'Works', 'Institutions'] as ResearchEntity[]).map((item) => { const Icon = entityIcons[item]; return <Button key={item} variant="outlined" onClick={() => changeEntity(item)} className="entity-suggestion"><Icon width={16} height={16} aria-hidden="true" />{item}</Button> })}</Box>
      <Typography className="search-empty-footnote">Your results and filters will appear here after searching.</Typography>
    </Paper> : <Box className="results-workspace">
      <Box className="filter-column">{filterGroups.map((group) => <FilterCard group={group} key={group.title} selected={selectedFilters} onToggle={toggleFilter} loading={filterGroupsLoading} error={Boolean(searchError) && facetState.key !== facetKey} />)}</Box>
      <Paper variant="outlined" className="results-panel">
        <Box className="results-toolbar">
          <Box className="results-heading"><Typography component="h2">{entity} results</Typography><Typography className="results-sample">{loading ? 'Loading' : searchError ? 'Unavailable' : `\u00b7 Sample ${showingCount ? `1\u2013${showingCount}` : '0'}`}</Typography></Box>
          <span className="toolbar-spacer" />
          <Select value={sortBy} onChange={(event) => setSortBy(event.target.value)} input={<InputBase />} inputProps={{ 'aria-label': 'Sort results' }} className="sort-select">
            {sortOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </Select>
          <Tooltip title="Download results"><span><IconButton onClick={() => exportCsv(records, entity)} aria-label="Download results" size="small" className="quiet-icon-button" disabled={!records.length}><ArrowDownTrayIcon width={17} height={17} /></IconButton></span></Tooltip>
          <Tooltip title="More options"><IconButton aria-label="More result options" size="small" className="quiet-icon-button"><EllipsisVerticalIcon width={17} height={17} /></IconButton></Tooltip>
        </Box>
        <Box className="results-divider" />
        {loading ? <Box className="results-status" role="status"><Typography>Loading results from OpenAlex...</Typography></Box>
          : searchError ? <Box className="results-status" role="alert"><Typography>{searchError}</Typography><Button size="small" onClick={() => setRequestVersion((version) => version + 1)}>Retry</Button></Box>
            : records.length === 0 ? <Box className="results-status"><Typography>No results found. Try another query or filter.</Typography></Box>
              : records.map((record) => <Box className="result-row" key={record.id}><Box className="result-avatar"><EntityIcon width={19} height={19} aria-hidden="true" /></Box><Box className="result-copy"><Typography component="h3">{record.title}</Typography><Typography className="result-organization">{record.organization}</Typography><Typography className="result-description">{record.description}</Typography></Box><Box className="result-count"><Typography>{record.count}</Typography><Typography>{record.countLabel}</Typography></Box></Box>)}
      </Paper>
    </Box>}
  </Box>
}
