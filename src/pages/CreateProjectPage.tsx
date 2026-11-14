import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Box, Button, FormControl, FormControlLabel, IconButton, InputBase, Paper, Popover, Radio, RadioGroup, TextField, Typography } from '@mui/material'
import { CheckIcon, ChevronDownIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline'
import { getSubjectAreas, searchKeywords, type WorkerKeyword, type WorkerSubjectArea } from '../services/workerApi'

type RecentProject = { name: string; subject: string; topics: string[] }

export function CreateProjectPage() {
  const [projectName, setProjectName] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [subjectOptions, setSubjectOptions] = useState<WorkerSubjectArea[]>([])
  const [subjectLoading, setSubjectLoading] = useState(true)
  const [subjectError, setSubjectError] = useState('')
  const [subjectRequestVersion, setSubjectRequestVersion] = useState(0)
  const [subjectPickerAnchor, setSubjectPickerAnchor] = useState<HTMLElement | null>(null)
  const [subjectDraftId, setSubjectDraftId] = useState('')
  const [subjectSearch, setSubjectSearch] = useState('')
  const [keywordQuery, setKeywordQuery] = useState('')
  const [suggestions, setSuggestions] = useState<WorkerKeyword[]>([])
  const [keywordRequestVersion, setKeywordRequestVersion] = useState(0)
  const [completedKeywordRequestKey, setCompletedKeywordRequestKey] = useState('')
  const [keywordFailure, setKeywordFailure] = useState<{ key: string; message: string } | null>(null)
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([])
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([])
  const [createdMessage, setCreatedMessage] = useState('')

  const subject = useMemo(
    () => subjectOptions.find((option) => option.id === subjectId)?.display_name ?? '',
    [subjectId, subjectOptions],
  )
  const filteredSubjectOptions = useMemo(() => {
    const query = subjectSearch.trim().toLocaleLowerCase()
    return query
      ? subjectOptions.filter((option) => option.display_name.toLocaleLowerCase().includes(query))
      : subjectOptions
  }, [subjectOptions, subjectSearch])
  const keywordSearch = keywordQuery.trim() || subject
  const keywordRequestKey = !subjectLoading && keywordSearch ? JSON.stringify([keywordSearch, keywordRequestVersion]) : ''
  const keywordError = keywordFailure?.key === keywordRequestKey ? keywordFailure.message : ''
  const keywordLoading = Boolean(keywordRequestKey) && completedKeywordRequestKey !== keywordRequestKey && !keywordError
  const canCreate = projectName.trim().length > 0 && Boolean(subjectId) && selectedKeywords.length > 0 && !subjectLoading

  useEffect(() => {
    const controller = new AbortController()
    getSubjectAreas(controller.signal)
      .then((items) => {
        setSubjectOptions(items)
        setSubjectId((current) => current && items.some((item) => item.id === current)
          ? current
          : items.find((item) => item.display_name.toLowerCase().includes('computer science'))?.id ?? items[0]?.id ?? '')
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setSubjectError(error instanceof Error ? error.message : 'Unable to load subject areas.')
      })
      .finally(() => { if (!controller.signal.aborted) setSubjectLoading(false) })
    return () => controller.abort()
  }, [subjectRequestVersion])

  useEffect(() => {
    if (!keywordRequestKey) return

    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      searchKeywords(keywordSearch, controller.signal)
        .then((items) => {
          setSuggestions(items)
          setCompletedKeywordRequestKey(keywordRequestKey)
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted) setKeywordFailure({ key: keywordRequestKey, message: error instanceof Error ? error.message : 'Unable to load keyword suggestions.' })
        })
    }, 250)
    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [keywordQuery, keywordRequestKey, keywordRequestVersion, keywordSearch, subject, subjectLoading])

  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords((current) => current.includes(keyword) ? current.filter((item) => item !== keyword) : [...current, keyword])
    setCreatedMessage('')
  }

  const resetForm = () => {
    setProjectName('')
    setSubjectId(subjectOptions.find((item) => item.display_name.toLowerCase().includes('computer science'))?.id ?? subjectOptions[0]?.id ?? '')
    setKeywordQuery('')
    setSelectedKeywords([])
    setCreatedMessage('')
  }

  const createProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canCreate) return
    setRecentProjects((current) => [{ name: projectName.trim(), subject, topics: selectedKeywords }, ...current].slice(0, 3))
    setCreatedMessage('Project created in this demo.')
    setProjectName('')
    setSelectedKeywords([])
  }

  const retrySubjects = () => {
    setSubjectLoading(true)
    setSubjectError('')
    setSubjectRequestVersion((version) => version + 1)
  }

  const closeSubjectPicker = () => {
    setSubjectPickerAnchor(null)
    setSubjectSearch('')
  }

  const applySubjectSelection = () => {
    if (subjectDraftId !== subjectId) {
      setSubjectId(subjectDraftId)
      setSelectedKeywords([])
      setCreatedMessage('')
    }
    closeSubjectPicker()
  }

  return <Box component="form" className="create-project-page" onSubmit={createProject}>
    <Box className="create-project-heading">
      <Box>
        <Typography component="h1">Create New Project</Typography>
        <Typography className="create-project-description">Set up a research project and choose topics to monitor.</Typography>
      </Box>
    </Box>

    <Box className="project-content-grid">
      <Box className="project-left-column">
        <Paper variant="outlined" className="project-info-card">
          <Box className="project-card-heading"><Typography component="h2">Project information</Typography></Box>
          <Typography className="project-info-description">Name your project and choose the research area.</Typography>
          <Box className="project-fields">
            <Box className="project-field">
              <label htmlFor="project-name">Project name <b>*</b></label>
              <TextField id="project-name" fullWidth size="small" value={projectName} onChange={(event) => { setProjectName(event.target.value); setCreatedMessage('') }} placeholder="Enter project name..." slotProps={{ htmlInput: { maxLength: 80 } }} />
            </Box>
            <Box className="project-field">
              <label id="subject-area-label">Subject area <b>*</b></label>
              <FormControl fullWidth size="small">
                <Button
                  id="subject-area"
                  type="button"
                  variant="outlined"
                  className="subject-area-trigger"
                  disabled={subjectLoading || !subjectOptions.length}
                  aria-labelledby="subject-area-label"
                  aria-haspopup="dialog"
                  aria-expanded={Boolean(subjectPickerAnchor)}
                  onClick={(event) => {
                    setSubjectDraftId(subjectId)
                    setSubjectSearch('')
                    setSubjectPickerAnchor(event.currentTarget)
                  }}
                >
                  <span>{subject || 'Select subject area'}</span>
                  <ChevronDownIcon width={16} height={16} aria-hidden="true" />
                </Button>
                <Popover
                  open={Boolean(subjectPickerAnchor)}
                  anchorEl={subjectPickerAnchor}
                  onClose={closeSubjectPicker}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                  slotProps={{ paper: {
                    className: 'subject-area-popover',
                    role: 'dialog',
                    'aria-label': 'Select subject area',
                    style: { width: subjectPickerAnchor ? Math.min(subjectPickerAnchor.getBoundingClientRect().width, window.innerWidth - 24) : undefined },
                  } }}
                >
                  <Box className="subject-area-search">
                    <MagnifyingGlassIcon width={16} height={16} aria-hidden="true" />
                    <InputBase
                      autoFocus
                      value={subjectSearch}
                      onChange={(event) => setSubjectSearch(event.target.value)}
                      placeholder="Search subject areas..."
                      inputProps={{
                        'aria-label': 'Search subject areas',
                        onKeyDown: (event) => { if (event.key === 'Enter') event.preventDefault() },
                      }}
                    />
                  </Box>
                  <Box className="subject-area-options">
                    {filteredSubjectOptions.length
                      ? <RadioGroup aria-label="Subject areas" value={subjectDraftId} onChange={(event) => setSubjectDraftId(event.target.value)}>
                        {filteredSubjectOptions.map((option) => <FormControlLabel
                          className={`subject-area-option${subjectDraftId === option.id ? ' is-selected' : ''}`}
                          key={option.id}
                          value={option.id}
                          control={<Radio size="small" />}
                          label={option.display_name}
                        />)}
                      </RadioGroup>
                      : <Typography className="subject-area-empty">No subject areas found.</Typography>}
                  </Box>
                  <Box className="filter-menu-actions">
                    <Button type="button" onClick={closeSubjectPicker}>Cancel</Button>
                    <Button type="button" variant="contained" disabled={!subjectDraftId} onClick={applySubjectSelection}>Apply</Button>
                  </Box>
                </Popover>
                {subjectLoading && <Typography className="data-status" role="status">Loading subject areas...</Typography>}
                {subjectError && <Typography className="data-status data-status-error" role="alert">{subjectError} <Button type="button" size="small" onClick={retrySubjects}>Retry</Button></Typography>}
                {!subjectLoading && !subjectError && !subjectOptions.length && <Typography className="data-status">No subject areas are available.</Typography>}
              </FormControl>
            </Box>
          </Box>
        </Paper>

        <Paper variant="outlined" className="recent-projects-card">
          <Box className="recent-projects-header"><Typography component="h2">Recent projects</Typography></Box>
          <Typography className="recent-projects-description">Projects you opened recently will show here.</Typography>
          {recentProjects.length === 0
            ? <Box className="recent-projects-empty"><Box><Typography>No recent projects yet</Typography><Typography>Your projects will appear here once created.</Typography></Box></Box>
            : <Box className="recent-project-list">{recentProjects.map((project, index) => <Box className="recent-project-row" key={`${project.name}-${index}`}><Box className="recent-project-mark">{project.name.slice(0, 1).toUpperCase()}</Box><Box className="recent-project-copy"><Typography>{project.name}</Typography><Typography>{project.subject} · {project.topics.length} topic{project.topics.length === 1 ? '' : 's'}</Typography></Box><CheckIcon width={16} height={16} aria-label="Created" /></Box>)}</Box>}
        </Paper>
      </Box>

      <Paper variant="outlined" className="keyword-explorer-card">
        <Box className="keyword-explorer-heading"><Typography component="h2">Keyword Explorer</Typography></Box>
        <Typography className="keyword-explorer-description">Add topics to monitor in your project.</Typography>
        <Box className="keyword-search"><InputBase value={keywordQuery} onChange={(event) => setKeywordQuery(event.target.value)} placeholder="Search keywords..." inputProps={{ 'aria-label': 'Search suggested keywords' }} /></Box>
        <Box className="keyword-list-header"><Typography>SUGGESTED KEYWORDS</Typography><Typography>{keywordLoading ? 'Loading' : `${suggestions.length} results`}</Typography></Box>
        <Box className="keyword-list" aria-label="Suggested keywords">
          {keywordLoading ? <Typography className="no-keywords" role="status">Searching OpenAlex keywords...</Typography>
            : keywordError ? <Typography className="no-keywords data-status-error" role="alert">{keywordError} <Button type="button" size="small" onClick={() => setKeywordRequestVersion((version) => version + 1)}>Retry</Button></Typography>
              : suggestions.length ? suggestions.map((keyword) => {
                const name = keyword.display_name || keyword.name
                const selected = selectedKeywords.includes(name)
                return <Box className="keyword-row" key={keyword.id || name}><Typography>{name}</Typography><IconButton onClick={() => toggleKeyword(name)} aria-label={selected ? `Remove ${name}` : `Add ${name}`} size="small" className={selected ? 'keyword-add is-selected' : 'keyword-add'}>{selected ? <CheckIcon width={17} height={17} /> : <PlusIcon width={17} height={17} />}</IconButton></Box>
              }) : <Typography className="no-keywords">No suggested keywords match your search.</Typography>}
        </Box>
        <Typography className="keyword-help">OpenAlex suggestions use the selected subject area or your search query.</Typography>
      </Paper>
    </Box>

    <Box className="project-flex-spacer" aria-hidden="true" />

    <Box className="create-project-footer">
      <Typography className="demo-note" role="status">{createdMessage || 'Project saving is local in this demo.'}</Typography>
      <Box className="project-footer-actions"><Button type="button" variant="outlined" onClick={resetForm} className="reset-button">Reset</Button><Button type="submit" variant="contained" disabled={!canCreate} className="create-button">Create Project <span aria-hidden="true">→</span></Button></Box>
    </Box>
  </Box>
}
