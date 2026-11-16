type WorkerErrorPayload = {
  error?: string
  message?: string
}

export type ApiPagination = {
  page: number
  limit: number
  total: number
  total_pages: number
}

export type WorkerListResponse<T> = {
  success: true
  data: T[]
  pagination?: ApiPagination
  total?: number
}

export type WorkerFacet = {
  value: string
  label: string
  count: number
}

export type WorkerOverviewBucket = {
  label: string
  count: number
}

export type WorkerProjectOverview = {
  total_works: number
  years: { year: number; count: number }[]
  source_types: WorkerOverviewBucket[]
  subject_areas: WorkerOverviewBucket[]
  journal_count: number
  journal_count_complete: boolean
  growth_rate: number | null
  updated_at: string
}

export type WorkerAuthor = {
  id: string
  author_id: string
  name: string
  works_count: number
  citation_count: number
  institution_1: string
  institution_2: string
  subject_areas: string[]
  orcid: string | null
}

export type WorkerWork = {
  id: string
  article_id: string
  title: string
  publication_year: number | null
  type: string
  citation_count: number
  journal_name: string | null
  authors: { name: string }[]
  subject_area: { name: string } | null
}

export type WorkerInstitution = {
  id: string
  institution_id: string
  name: string
  display_name: string
  country_code: string
  type: string
  works_count: number
  cited_by_count: number
  city: string
  region: string
}

export type WorkerSource = {
  id: string
  journal_id: string
  name: string
  display_name: string
  type: string
  publisher_name: string
  country_code: string
  is_open_access: boolean
  works_count: number
  cited_by_count: number
  metric_value: number
  metric_name: string
  subject_area_name: string
  subject_category_name: string
}

export type WorkerFilterValue = {
  value: string
  label: string
  count: number
}

export type WorkerCountry = {
  zone_id: string
  name: string
}

export type WorkerSubjectArea = {
  id: string
  subject_area_id: string
  display_name: string
  name: string
}

export type WorkerKeyword = {
  id: string
  keyword_id: string
  name: string
  display_name: string
  works_count: number
}

export type ResearchEntity = 'Authors' | 'Works' | 'Institutions' | 'Sources'
export type FilterValueEntity = 'institutions' | 'topics' | 'publishers'

export type ResearchSearchParams = {
  query: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  institution_id?: string
  country_code?: string
  has_orcid?: string
  publication_year?: string
  type?: string
  is_open_access?: string
  topic_id?: string
  publisher_id?: string
  include_facets?: number
}

type WorkerEnvelope<T> = {
  success?: boolean
  data?: T
  pagination?: ApiPagination
  total?: number
  facets?: Record<string, WorkerFacet[]>
} & WorkerErrorPayload

function apiUrl(path: string, params: Record<string, string | number | undefined> = {}) {
  const baseUrl = import.meta.env.VITE_WORKER_API_URL?.trim().replace(/\/+$/, '')
  if (!baseUrl) throw new Error('Worker API URL is missing. Set VITE_WORKER_API_URL in .env.local.')

  const url = new URL(`${baseUrl}${path}`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
  }
  return url
}

async function getJson<T>(path: string, params: Record<string, string | number | undefined> = {}, signal?: AbortSignal): Promise<T> {
  const response = await fetch(apiUrl(path, params), {
    headers: { Accept: 'application/json' },
    signal,
  })
  const payload = await response.json().catch(() => null) as WorkerEnvelope<T> | null
  if (!response.ok || !payload || typeof payload !== 'object') {
    throw new Error(payload?.message || payload?.error || `Worker request failed (${response.status}).`)
  }
  if (payload.success === false) throw new Error(payload.message || payload.error || 'Worker request failed.')
  return payload as T
}

function unwrap<T>(response: WorkerEnvelope<T>): T {
  if (!response.success || response.data === undefined) {
    throw new Error(response.message || response.error || 'Worker returned an invalid response.')
  }
  return response.data
}

export async function searchResearch(entity: ResearchEntity, params: ResearchSearchParams, signal?: AbortSignal) {
  const response = await getJson<WorkerEnvelope<Array<WorkerAuthor | WorkerWork | WorkerInstitution | WorkerSource>>>(
    '/api/v1/search',
    { ...params, entity: entity.toLowerCase() },
    signal,
  )
  return {
    items: unwrap(response),
    pagination: response.pagination,
    total: response.total ?? response.pagination?.total ?? 0,
    facets: response.facets ?? {},
  }
}

export async function getProjectOverview(query: string, signal?: AbortSignal) {
  const response = await getJson<WorkerEnvelope<WorkerProjectOverview>>(
    '/api/v1/projects/overview',
    { query },
    signal,
  )
  return unwrap(response)
}

export async function exchangeSsoAccessTokenForFirebaseCustomToken(accessToken: string) {
  const response = await fetch(apiUrl('/api/v1/auth/sso/custom-token'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ accessToken }),
    credentials: 'omit',
  })
  const payload = await response.json().catch(() => null) as { customToken?: unknown; error?: unknown } | null
  if (!response.ok || typeof payload?.customToken !== 'string') {
    throw new Error(typeof payload?.error === 'string' ? payload.error : `Worker request failed (${response.status}).`)
  }
  return payload.customToken
}

export async function searchFilterValues(entity: FilterValueEntity, query: string, filters: Record<string, string> = {}, signal?: AbortSignal) {
  const response = await getJson<WorkerEnvelope<WorkerFilterValue[]>>(
    '/api/v1/catalog/filter-values',
    { entity, query, limit: 10, ...filters },
    signal,
  )
  return unwrap(response)
}

export async function getCountries(signal?: AbortSignal) {
  const response = await getJson<{ source: string; items: WorkerCountry[] }>('/api/v1/catalog/countries', {}, signal)
  return response.items ?? []
}

export async function getSubjectAreas(signal?: AbortSignal) {
  const response = await getJson<WorkerEnvelope<WorkerSubjectArea[]>>('/api/v1/subject-areas', {}, signal)
  return unwrap(response)
}

export async function searchKeywords(search: string, signal?: AbortSignal) {
  const response = await getJson<WorkerEnvelope<WorkerKeyword[]>>('/api/v1/keywords', { search, page: 1, limit: 10 }, signal)
  return unwrap(response)
}
