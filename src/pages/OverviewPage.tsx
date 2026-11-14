import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Box, Button, Checkbox, FormControl, IconButton, InputBase, MenuItem, Pagination, Paper, Popover, Select, Tooltip, Typography } from '@mui/material'
import { ArrowDownTrayIcon, BuildingOffice2Icon, CheckIcon, ChevronDownIcon, ChevronRightIcon, DocumentTextIcon, EllipsisVerticalIcon, MagnifyingGlassIcon, UserIcon, XMarkIcon } from '@heroicons/react/24/outline'
import {
  getCountries,
  searchResearch,
  searchFilterValues,
  type FilterValueEntity,
  type ResearchEntity,
  type ResearchSearchParams,
  type WorkerAuthor,
  type WorkerCountry,
  type WorkerFacet,
  type WorkerFilterValue,
  type WorkerInstitution,
  type WorkerSource,
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
type FilterGroup = { title: string; key: string; options: FilterOption[]; allOptions: FilterOption[] }
type FilterDefinition = { title: string; label: string; key: string; lookupEntity?: FilterValueEntity; searchPlaceholder?: string }
type FacetState = { key: string; facets: Record<string, WorkerFacet[]> }

const emptyFacets: Record<string, WorkerFacet[]> = {}

const entityIcons = { Authors: UserIcon, Works: DocumentTextIcon, Institutions: BuildingOffice2Icon, Sources: DocumentTextIcon }
const defaultSort: Record<ResearchEntity, string> = {
  Authors: 'works_count',
  Works: 'cited_by_count',
  Institutions: 'works_count',
  Sources: 'works_count',
}
const resultPageSizes = [10, 20, 50, 100]

const quickFilterDefinitions: Record<ResearchEntity, FilterDefinition[]> = {
  Authors: [
    { title: 'Exact Institution', label: 'Institution', key: 'institution_id', lookupEntity: 'institutions', searchPlaceholder: 'Institutions' },
    { title: 'Institution Country', label: 'Country', key: 'country_code', searchPlaceholder: 'Institution countries' },
  ],
  Works: [
    { title: 'Publication year', label: 'Year', key: 'publication_year' },
    { title: 'Exact Institution', label: 'Institution', key: 'institution_id', lookupEntity: 'institutions', searchPlaceholder: 'Institutions' },
    { title: 'Open access', label: 'Open Access', key: 'is_open_access' },
    { title: 'Work type', label: 'Type', key: 'type' },
  ],
  Institutions: [
    { title: 'Institution type', label: 'Institution type', key: 'type' },
    { title: 'Institution Country', label: 'Country', key: 'country_code', searchPlaceholder: 'Institution countries' },
  ],
  Sources: [
    { title: 'Source type', label: 'Source type', key: 'type' },
    { title: 'Topic', label: 'Topic', key: 'topic_id', lookupEntity: 'topics', searchPlaceholder: 'Topics' },
    { title: 'Open access', label: 'Open Access', key: 'is_open_access' },
    { title: 'Publisher', label: 'Publisher', key: 'publisher_id', lookupEntity: 'publishers', searchPlaceholder: 'Publishers' },
  ],
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

function makeFilterGroups(
  entity: ResearchEntity,
  facets: Record<string, WorkerFacet[]>,
  selectedFilters: Set<string>,
  selectedLabels: Record<string, FilterOption>,
): FilterGroup[] {
  const definitions: Record<ResearchEntity, { title: string; key: string }[]> = {
    Authors: [
      { title: 'Exact Institution', key: 'institution_id' },
      { title: 'Institution Country', key: 'country_code' },
      { title: 'Has ORCID', key: 'has_orcid' },
    ],
    Works: [
      { title: 'Publication year', key: 'publication_year' },
      { title: 'Exact Institution', key: 'institution_id' },
      { title: 'Work type', key: 'type' },
      { title: 'Open access', key: 'is_open_access' },
    ],
    Institutions: [
      { title: 'Institution Country', key: 'country_code' },
      { title: 'Institution type', key: 'type' },
    ],
    Sources: [
      { title: 'Source type', key: 'type' },
      { title: 'Topic', key: 'topic_id' },
      { title: 'Open access', key: 'is_open_access' },
      { title: 'Publisher', key: 'publisher_id' },
    ],
  }

  const optionLimit = definitions[entity].length > 3 ? 3 : 4
  return definitions[entity].map(({ title, key }) => {
    const facetOptions = (facets[key] ?? []).map((option) => ({
      label: key === 'has_orcid' || key === 'is_open_access'
        ? option.value === 'true' ? 'Yes' : 'No'
        : key === 'type' ? titleCase(option.label) : option.label,
      value: option.value,
      count: formatCount(option.count),
    }))
    if (key === 'publication_year') facetOptions.sort((left, right) => Number(right.value) - Number(left.value))
    const selected = selectedValues(selectedFilters, key).map((value) => (
      facetOptions.find((option) => option.value === value)
      ?? selectedLabels[`${key}:${value}`]
      ?? { label: value, value, count: '' }
    ))
    const selectedValuesSet = new Set(selected.map((option) => option.value))
    const allOptions = [...selected, ...facetOptions.filter((option) => !selectedValuesSet.has(option.value))]
    const options = allOptions.slice(0, optionLimit)
    return { title, key, options, allOptions }
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

function mapSources(sources: WorkerSource[]): RecordItem[] {
  return sources.map((source) => ({
    id: source.id,
    title: source.name || 'Untitled source',
    organization: source.publisher_name,
    description: [titleCase(source.type), source.subject_area_name, source.subject_category_name].filter(Boolean).join(' · '),
    count: formatCount(source.works_count),
    countLabel: 'Works',
  }))
}

function EntitySelect({ value, onChange }: { value: ResearchEntity; onChange: (value: ResearchEntity) => void }) {
  return <FormControl variant="standard" className="entity-select">
    <Select value={value} onChange={(event) => onChange(event.target.value as ResearchEntity)} input={<InputBase />} inputProps={{ 'aria-label': 'Search category' }}>
      {(['Authors', 'Works', 'Institutions', 'Sources'] as ResearchEntity[]).map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
    </Select>
  </FormControl>
}

function FilterMenu({ definition, options, selected, selectedLabels, selectedFilters, contextEntity, contextQuery, onApply, loading, error }: {
  definition: FilterDefinition
  options: FilterOption[]
  selected: string[]
  selectedLabels: Record<string, FilterOption>
  selectedFilters: Set<string>
  contextEntity: ResearchEntity
  contextQuery: string
  onApply: (key: string, values: string[], options: FilterOption[]) => void
  loading: boolean
  error: boolean
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [draftValues, setDraftValues] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<FilterOption[] | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const open = Boolean(anchorEl)
  const normalizedSearch = searchTerm.trim()
  const lookupFilterParams = useMemo<Record<string, string>>(() => {
    const filters: Record<string, string> = {}
    if (definition.lookupEntity) {
      const grouped = new Map<string, string[]>()
      for (const selectedFilter of selectedFilters) {
        const separator = selectedFilter.indexOf(':')
        if (separator < 0) continue
        const key = selectedFilter.slice(0, separator)
        const value = selectedFilter.slice(separator + 1)
        if (key === definition.key) continue
        grouped.set(key, [...(grouped.get(key) ?? []), value])
      }
      for (const [key, values] of grouped) filters[key] = values.join('|')
      filters.context_entity = contextEntity.toLowerCase()
      filters.context_query = contextQuery
    }
    return filters
  }, [definition.lookupEntity, definition.key, selectedFilters, contextEntity, contextQuery])
  const pluralLabels: Record<string, string> = {
    country_code: 'countries',
    institution_id: 'institutions',
    publication_year: 'years',
    has_orcid: 'ORCID options',
    type: definition.label.toLowerCase().includes('institution') ? 'institution types' : 'types',
    is_open_access: 'access options',
    topic_id: 'topics',
    publisher_id: 'publishers',
  }
  const selectionLabel = selected.length === 0
    ? definition.label
    : selected.length === 1
      ? selectedLabels[`${definition.key}:${selected[0]}`]?.label ?? definition.label
      : `${selected.length} ${pluralLabels[definition.key] ?? 'selected'}`

  useEffect(() => {
    if (!open || !definition.lookupEntity || !normalizedSearch) return

    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      searchFilterValues(definition.lookupEntity!, normalizedSearch, lookupFilterParams, controller.signal)
        .then((values: WorkerFilterValue[]) => {
          if (!controller.signal.aborted) setSearchResults(values.map((item) => ({ label: item.label, value: item.value, count: formatCount(item.count) })))
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSearchResults([])
            setSearchError(true)
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearchLoading(false)
        })
    }, 250)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [open, definition.lookupEntity, normalizedSearch, lookupFilterParams])

  const filteredOptions = useMemo(() => {
    if (definition.lookupEntity && normalizedSearch) return searchResults ?? []
    if (!definition.lookupEntity && normalizedSearch) {
      const normalized = normalizedSearch.toLocaleLowerCase()
      return options.filter((option) => option.label.toLocaleLowerCase().includes(normalized))
    }
    return options
  }, [definition.lookupEntity, normalizedSearch, searchResults, options])

  const menuOptions = useMemo(() => {
    const merged = new Map(filteredOptions.map((option) => [option.value, option]))
    for (const value of draftValues) {
      const optionKey = `${definition.key}:${value}`
      if (!merged.has(value) && selectedLabels[optionKey]) merged.set(value, selectedLabels[optionKey])
    }
    return [...merged.values()]
  }, [filteredOptions, draftValues, definition.key, selectedLabels])

  const closeMenu = () => {
    setAnchorEl(null)
    setSearchTerm('')
    setSearchResults(null)
    setSearchLoading(false)
    setSearchError(false)
  }

  return <>
    <Button
      className="quick-filter-trigger"
      type="button"
      onClick={(event) => {
        setDraftValues(new Set(selected))
        setAnchorEl(event.currentTarget)
      }}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={selected.length ? `${selectionLabel}, edit filter` : definition.label}
    >
      <span className="quick-filter-summary">{selectionLabel}</span>
      {selected.length === 0 && <ChevronDownIcon width={12} height={12} aria-hidden="true" />}
    </Button>
    {selected.length > 0 && <IconButton
      className="quick-filter-clear"
      type="button"
      aria-label={`Clear ${definition.label} filter`}
      onClick={(event) => {
        event.stopPropagation()
        onApply(definition.key, [], [])
        closeMenu()
      }}
    ><XMarkIcon width={14} height={14} aria-hidden="true" /></IconButton>}
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={closeMenu}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{ paper: { className: definition.searchPlaceholder || definition.lookupEntity ? 'filter-menu-paper filter-menu-paper-searchable' : 'filter-menu-paper filter-menu-paper-compact' } }}
    >
      {(definition.searchPlaceholder || definition.lookupEntity) && <Box className="filter-menu-search">
        <MagnifyingGlassIcon width={15} height={15} aria-hidden="true" />
        <InputBase
          value={searchTerm}
          onChange={(event) => {
            const value = event.target.value
            setSearchTerm(value)
            setSearchResults(null)
            setSearchLoading(Boolean(definition.lookupEntity && value.trim()))
            setSearchError(false)
          }}
          placeholder={definition.searchPlaceholder ?? definition.title}
          inputProps={{ 'aria-label': `Search ${definition.title.toLowerCase()} values` }}
          autoFocus
        />
      </Box>}
      <Box className="filter-menu-options">
        {searchLoading || (loading && !normalizedSearch) ? <Typography className="filter-menu-status" role="status">Loading filters...</Typography>
          : searchError || (error && !normalizedSearch) ? <Typography className="filter-menu-status" role="status">Filter values are unavailable.</Typography>
            : menuOptions.length === 0 ? <Typography className="filter-menu-status">No options found.</Typography>
              : menuOptions.map((option) => <label className="filter-menu-option" key={option.value}>
                <Checkbox
                  size="small"
                  checked={draftValues.has(option.value)}
                  onChange={() => setDraftValues((current) => {
                    const next = new Set(current)
                    if (next.has(option.value)) next.delete(option.value)
                    else next.add(option.value)
                    return next
                  })}
                  slotProps={{ input: { 'aria-label': option.label } }}
                  sx={{ p: 0, color: '#727a83', '&.Mui-checked': { color: '#0879c9' } }}
                />
                <span className="filter-menu-option-label" title={option.label}>{option.label}</span>
                <span className="filter-menu-option-count">{option.count}</span>
              </label>)}
      </Box>
      <Box className="filter-menu-actions">
        <Button type="button" onClick={closeMenu}>Cancel</Button>
        <Button type="button" variant="contained" onClick={() => { onApply(definition.key, [...draftValues], menuOptions); closeMenu() }}>Apply</Button>
      </Box>
    </Popover>
  </>
}
function FilterCard({ group, selected, onToggle, onApply, loading, error }: {
  group: FilterGroup
  selected: Set<string>
  onToggle: (key: string, value: string, option?: FilterOption) => void
  onApply: (key: string, values: string[], options: FilterOption[]) => void
  loading: boolean
  error: boolean
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [draftValues, setDraftValues] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const open = Boolean(anchorEl)
  const visibleMoreOptions = group.allOptions.filter((option) => option.label.toLocaleLowerCase().includes(searchTerm.trim().toLocaleLowerCase()))
  const closeMore = () => {
    setAnchorEl(null)
    setSearchTerm('')
  }

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
          <Checkbox size="small" checked={selected.has(key)} onChange={() => onToggle(group.key, option.value, option)} slotProps={{ input: { 'aria-label': option.label } }} sx={{ p: 0, color: '#727a83', '&.Mui-checked': { color: '#0879c9' } }} />
          <span className="filter-option-label">{option.label}</span>
          <span className="filter-option-count">{option.count}</span>
        </label>
      })}
    </Box>
    {!loading && !error && group.allOptions.length > group.options.length && <Button
      className="filter-card-more"
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={(event) => {
        setDraftValues(new Set(selectedValues(selected, group.key)))
        setSearchTerm('')
        setAnchorEl(event.currentTarget)
      }}
    >More...</Button>}
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={closeMore}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{ paper: { className: 'filter-menu-paper filter-menu-paper-searchable', role: 'dialog', 'aria-label': `More ${group.title} filters` } }}
    >
      <Box className="filter-menu-search">
        <MagnifyingGlassIcon width={15} height={15} aria-hidden="true" />
        <InputBase
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={group.title}
          inputProps={{ 'aria-label': `Search ${group.title.toLowerCase()} values` }}
          autoFocus
        />
      </Box>
      <Box className="filter-menu-options">
        {visibleMoreOptions.length === 0 ? <Typography className="filter-menu-status">No options found.</Typography>
          : visibleMoreOptions.map((option) => <label className="filter-menu-option" key={option.value}>
            <Checkbox
              size="small"
              checked={draftValues.has(option.value)}
              onChange={() => setDraftValues((current) => {
                const next = new Set(current)
                if (next.has(option.value)) next.delete(option.value)
                else next.add(option.value)
                return next
              })}
              slotProps={{ input: { 'aria-label': option.label } }}
              sx={{ p: 0, color: '#727a83', '&.Mui-checked': { color: '#0879c9' } }}
            />
            <span className="filter-menu-option-label" title={option.label}>{option.label}</span>
            <span className="filter-menu-option-count">{option.count}</span>
          </label>)}
      </Box>
      <Box className="filter-menu-actions">
        <Button type="button" onClick={closeMore}>Cancel</Button>
        <Button type="button" variant="contained" onClick={() => { onApply(group.key, [...draftValues], group.allOptions); closeMore() }}>Apply</Button>
      </Box>
    </Popover>
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
  const [hasSearched, setHasSearched] = useState(false)
  const [requestVersion, setRequestVersion] = useState(0)
  const [sortBy, setSortBy] = useState(defaultSort.Authors)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [resultMenuAnchor, setResultMenuAnchor] = useState<HTMLElement | null>(null)
  const [pageSizeMenuAnchor, setPageSizeMenuAnchor] = useState<HTMLElement | null>(null)
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set())
  const [filterOptionLabels, setFilterOptionLabels] = useState<Record<string, FilterOption>>({})
  const [records, setRecords] = useState<RecordItem[]>([])
  const [total, setTotal] = useState(0)
  const [completedRequestKey, setCompletedRequestKey] = useState('')
  const [searchFailure, setSearchFailure] = useState<{ key: string; message: string } | null>(null)
  const [countries, setCountries] = useState<WorkerCountry[]>([])
  const [countriesLoading, setCountriesLoading] = useState(true)
  const [countriesError, setCountriesError] = useState(false)
  const [facetState, setFacetState] = useState<FacetState>({ key: '', facets: emptyFacets })
  const facetCache = useRef<FacetState | null>(null)

  const facetKey = JSON.stringify([entity, submittedQuery, [...selectedFilters].sort()])
  const visibleFacets = facetState.key === facetKey ? facetState.facets : emptyFacets
  const countryCounts = useMemo(() => new Map((visibleFacets.country_code ?? []).map((item) => [item.value, item.count])), [visibleFacets])
  const countryOptions = useMemo(() => {
    const selectedCountries = new Set(selectedValues(selectedFilters, 'country_code'))
    const hasOtherFilters = [...selectedFilters].some((item) => !item.startsWith('country_code:'))
    return countries
      .filter((country) => !hasOtherFilters || countryCounts.has(country.zone_id) || selectedCountries.has(country.zone_id))
      .map((country) => ({
        label: country.name,
        value: country.zone_id,
        count: formatCount(countryCounts.get(country.zone_id) ?? 0),
      }))
  }, [countries, countryCounts, selectedFilters])
  const filterGroups = useMemo(
    () => makeFilterGroups(entity, visibleFacets, selectedFilters, filterOptionLabels),
    [entity, visibleFacets, selectedFilters, filterOptionLabels],
  )
  const requestKey = JSON.stringify({
    query: submittedQuery,
    requestVersion,
    entity,
    sortBy,
    currentPage,
    pageSize,
    filters: [...selectedFilters].sort(),
    countries: countries.map(({ zone_id, name }) => [zone_id, name]),
  })
  const searchError = searchFailure?.key === requestKey ? searchFailure.message : ''
  const showResults = hasSearched || Boolean(submittedQuery)
  const loading = showResults && completedRequestKey !== requestKey && !searchError
  const filterGroupsLoading = facetState.key !== facetKey && !searchError
  const filterGroupsError = Boolean(searchError) && facetState.key !== facetKey
  const sortOptions = entity === 'Works'
    ? [{ value: 'cited_by_count', label: 'Most citations' }, { value: 'publication_year', label: 'Most recent' }, { value: 'title', label: 'Title' }]
    : entity === 'Sources'
      ? [{ value: 'works_count', label: 'Most works' }, { value: 'cited_by_count', label: 'Most citations' }, { value: 'metric_value', label: '2yr mean citedness' }, { value: 'display_name', label: 'Name' }]
      : [{ value: 'works_count', label: 'Most works' }, { value: 'cited_by_count', label: 'Most citations' }]

  useEffect(() => {
    const controller = new AbortController()
    getCountries(controller.signal)
      .then((countryItems) => {
        if (!controller.signal.aborted) setCountries(countryItems.sort((left, right) => left.name.localeCompare(right.name)))
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setCountries([])
          setCountriesError(true)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCountriesLoading(false)
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (countriesLoading) return
    const controller = new AbortController()
    const cachedFacets = facetCache.current?.key === facetKey
    const params: ResearchSearchParams = {
      query: submittedQuery,
      page: currentPage,
      limit: pageSize,
      sortBy,
      sortOrder: 'desc',
      institution_id: entity === 'Authors' || entity === 'Works' ? selectedValues(selectedFilters, 'institution_id').join('|') : undefined,
      country_code: entity === 'Authors' || entity === 'Works' || entity === 'Institutions' ? selectedValues(selectedFilters, 'country_code').join('|') : undefined,
      has_orcid: entity === 'Authors' ? selectedValues(selectedFilters, 'has_orcid').join('|') : undefined,
      publication_year: entity === 'Works' ? selectedValues(selectedFilters, 'publication_year').join('|') : undefined,
      type: entity === 'Institutions' || entity === 'Works' || entity === 'Sources' ? selectedValues(selectedFilters, 'type').join('|') : undefined,
      is_open_access: entity === 'Works' || entity === 'Sources' ? selectedValues(selectedFilters, 'is_open_access').join('|') : undefined,
      topic_id: entity === 'Sources' ? selectedValues(selectedFilters, 'topic_id').join('|') : undefined,
      publisher_id: entity === 'Sources' ? selectedValues(selectedFilters, 'publisher_id').join('|') : undefined,
      include_facets: cachedFacets ? 0 : 1,
    }

    searchResearch(entity, params, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        if (entity === 'Authors') setRecords(mapAuthors(result.items as WorkerAuthor[]))
        else if (entity === 'Works') setRecords(mapWorks(result.items as WorkerWork[]))
        else if (entity === 'Institutions') setRecords(mapInstitutions(result.items as WorkerInstitution[], countries))
        else setRecords(mapSources(result.items as WorkerSource[]))
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
  }, [countriesLoading, submittedQuery, requestVersion, entity, sortBy, currentPage, pageSize, selectedFilters, countries, requestKey, facetKey])

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedQuery = query.trim()
    if (!trimmedQuery && selectedFilters.size === 0) return
    setCurrentPage(1)
    setSubmittedQuery(trimmedQuery)
    setHasSearched(true)
    setRequestVersion((version) => version + 1)
  }

  const changeEntity = (nextEntity: ResearchEntity) => {
    if (nextEntity === entity) return
    const nextFacetKey = JSON.stringify([nextEntity, submittedQuery, []])
    const cachedFacets = facetCache.current?.key === nextFacetKey ? facetCache.current : null
    setEntity(nextEntity)
    setSortBy(defaultSort[nextEntity])
    setCurrentPage(1)
    setSelectedFilters(new Set())
    setFilterOptionLabels({})
    setHasSearched(Boolean(submittedQuery))
    setFacetState(cachedFacets ?? { key: '', facets: emptyFacets })
  }

  const rememberOptions = (key: string, options: FilterOption[]) => {
    setFilterOptionLabels((current) => {
      const next = { ...current }
      for (const option of options) next[key + ':' + option.value] = option
      return next
    })
  }

  const applyFilter = (key: string, values: string[], options: FilterOption[]) => {
    setCurrentPage(1)
    setSelectedFilters((current) => {
      const next = new Set([...current].filter((item) => !item.startsWith(key + ':')))
      for (const value of values) next.add(key + ':' + value)
      return next
    })
    rememberOptions(key, options)
    setHasSearched(true)
  }

  const toggleFilter = (key: string, value: string, option?: FilterOption) => {
    setCurrentPage(1)
    setSelectedFilters((current) => {
      const next = new Set(current)
      const item = key + ':' + value
      if (next.has(item)) next.delete(item)
      else next.add(item)
      return next
    })
    if (option) rememberOptions(key, [option])
    setHasSearched(true)
  }

  const optionsFor = (definition: FilterDefinition) => {
    if (definition.key === 'country_code') return countryOptions
    return (visibleFacets[definition.key] ?? []).map((item) => ({
      label: item.label,
      value: item.value,
      count: formatCount(item.count),
    }))
  }

  const EntityIcon = entityIcons[entity]
  const showingStart = records.length ? (currentPage - 1) * pageSize + 1 : 0
  const showingEnd = records.length ? Math.min(total, (currentPage - 1) * pageSize + records.length) : 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return <Box className="overview-page">
    <Box className="overview-controls">
      <Box className="search-page-heading"><Typography component="h1">Time to search something great.</Typography></Box>
      <Box component="form" className="research-search" onSubmit={submitSearch}>
        <EntitySelect value={entity} onChange={changeEntity} />
        <InputBase className="research-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" inputProps={{ 'aria-label': 'Search scientific research' }} />
        <Tooltip title="Search options"><IconButton type="button" aria-label="Search options" className="query-more-button"><EllipsisVerticalIcon width={18} height={18} /></IconButton></Tooltip>
        <Tooltip title="Search"><IconButton type="submit" aria-label="Search" className="query-submit-button"><MagnifyingGlassIcon width={18} height={18} /></IconButton></Tooltip>
      </Box>
      <Box className="quick-filters">
        {quickFilterDefinitions[entity].map((definition) => {
          const selected = selectedValues(selectedFilters, definition.key)
          return <Box className={`quick-filter-chip${selected.length ? ' is-selected' : ''}`} key={entity + '-' + definition.key}>
          <FilterMenu
            definition={definition}
            options={optionsFor(definition)}
            selected={selected}
            selectedLabels={filterOptionLabels}
            selectedFilters={selectedFilters}
            contextEntity={entity}
            contextQuery={submittedQuery}
            onApply={applyFilter}
            loading={filterGroupsLoading || (definition.key === 'country_code' && countriesLoading)}
            error={filterGroupsError || (definition.key === 'country_code' && countriesError)}
          />
        </Box>
        })}
        <Button className="more-filters-button" type="button">More filters</Button>
      </Box>
    </Box>

    {!showResults ? <Paper variant="outlined" className="search-empty-state">
      <Box className="search-empty-icon"><MagnifyingGlassIcon aria-hidden="true" /></Box>
      <Typography component="h2">Discover scientific research</Typography>
      <Typography className="search-empty-description">Enter a query or choose a research category to start exploring OpenAlex.</Typography>
      <Box className="suggested-entities">{(['Authors', 'Works', 'Institutions'] as ResearchEntity[]).map((item) => { const Icon = entityIcons[item]; return <Button key={item} variant="outlined" onClick={() => changeEntity(item)} className="entity-suggestion"><Icon width={16} height={16} aria-hidden="true" />{item}</Button> })}</Box>
      <Typography className="search-empty-footnote">Your results and filters will appear here after searching.</Typography>
    </Paper> : <Box className="results-workspace">
      <Box className="filter-column" style={{ gridTemplateRows: 'repeat(' + filterGroups.length + ', minmax(0, 1fr))' }}>
        {filterGroups.map((group) => <FilterCard group={group} key={group.title} selected={selectedFilters} onToggle={toggleFilter} onApply={applyFilter} loading={filterGroupsLoading} error={filterGroupsError} />)}
      </Box>
      <Paper variant="outlined" className="results-panel">
        <Box className="results-toolbar">
          <Box className="results-heading"><Typography component="h2">{entity} results</Typography><Typography className="results-sample">{loading ? 'Loading' : searchError ? 'Unavailable' : '· Sample ' + (records.length ? `${showingStart}–${showingEnd}` : '0')}</Typography></Box>
          <span className="toolbar-spacer" />
          <Select value={sortBy} onChange={(event) => { setSortBy(event.target.value); setCurrentPage(1) }} input={<InputBase />} inputProps={{ 'aria-label': 'Sort results' }} className="sort-select">
            {sortOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </Select>
          <Tooltip title="Download results"><span><IconButton onClick={() => exportCsv(records, entity)} aria-label="Download results" size="small" className="quiet-icon-button" disabled={!records.length}><ArrowDownTrayIcon width={17} height={17} /></IconButton></span></Tooltip>
          <Tooltip title="More options"><IconButton onClick={(event) => { setPageSizeMenuAnchor(null); setResultMenuAnchor(event.currentTarget) }} aria-label="More result options" aria-haspopup="menu" aria-expanded={Boolean(resultMenuAnchor)} size="small" className="quiet-icon-button"><EllipsisVerticalIcon width={17} height={17} /></IconButton></Tooltip>
        </Box>
        <Popover
          open={Boolean(resultMenuAnchor)}
          anchorEl={resultMenuAnchor}
          onClose={() => { setResultMenuAnchor(null); setPageSizeMenuAnchor(null) }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { className: 'results-options-popover', role: 'menu', 'aria-label': 'Result options' } }}
        >
          <Button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={Boolean(pageSizeMenuAnchor)}
            className="results-page-size-trigger"
            onClick={(event) => setPageSizeMenuAnchor(event.currentTarget)}
          >
            <span>Page size</span>
            <span className="results-page-size-current">{pageSize}</span>
            <ChevronRightIcon width={15} height={15} aria-hidden="true" />
          </Button>
        </Popover>
        <Popover
          open={Boolean(pageSizeMenuAnchor)}
          anchorEl={pageSizeMenuAnchor}
          onClose={() => setPageSizeMenuAnchor(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{ paper: { className: 'results-page-size-popover', role: 'menu', 'aria-label': 'Page size' } }}
        >
          {resultPageSizes.map((size) => <Button
            key={size}
            type="button"
            role="menuitemradio"
            aria-checked={pageSize === size}
            className="results-page-size-option"
            onClick={() => {
              setPageSize(size)
              setCurrentPage(1)
              setPageSizeMenuAnchor(null)
              setResultMenuAnchor(null)
            }}
          >
            <span className="results-page-size-check">{pageSize === size && <CheckIcon width={16} height={16} aria-hidden="true" />}</span>
            <span>{size}</span>
          </Button>)}
        </Popover>
        <Box className="results-divider" />
        <Box className="results-scroll" aria-label="Search results">
          {loading ? <Box className="results-status" role="status"><Typography>Loading results from OpenAlex...</Typography></Box>
            : searchError ? <Box className="results-status" role="alert"><Typography>{searchError}</Typography><Button size="small" onClick={() => setRequestVersion((version) => version + 1)}>Retry</Button></Box>
              : records.length === 0 ? <Box className="results-status"><Typography>No results found. Try another query or filter.</Typography></Box>
                : records.map((record) => <Box className="result-row" key={record.id}><Box className="result-avatar"><EntityIcon width={19} height={19} aria-hidden="true" /></Box><Box className="result-copy"><Typography component="h3">{record.title}</Typography><Typography className="result-organization">{record.organization}</Typography><Typography className="result-description">{record.description}</Typography></Box><Box className="result-count"><Typography>{record.count}</Typography><Typography>{record.countLabel}</Typography></Box></Box>)}
        </Box>
        {!loading && !searchError && records.length > 0 && <Box className="results-footer">
          <Typography component="p">Showing {showingStart}–{showingEnd} of {total.toLocaleString('en-US')}</Typography>
          <Pagination count={totalPages} page={currentPage} onChange={(_, nextPage) => setCurrentPage(nextPage)} size="small" siblingCount={0} boundaryCount={1} aria-label="Results pages" />
        </Box>}
      </Paper>
    </Box>}
  </Box>
}
