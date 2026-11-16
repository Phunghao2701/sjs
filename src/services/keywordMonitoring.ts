import { searchResearch } from './workerApi'

export type KeywordMonitoringResult = { total: number }

const resultCache = new Map<string, { expiresAt: number; data: KeywordMonitoringResult }>()
const resultCacheTtlMs = 120_000
let cacheGeneration = 0

export function clearKeywordMonitoringCache() {
  cacheGeneration += 1
  resultCache.clear()
}

export async function getKeywordMonitoringResult(query: string, signal: AbortSignal): Promise<KeywordMonitoringResult> {
  const cacheKey = query.trim().toLocaleLowerCase()
  const requestGeneration = cacheGeneration
  const cached = resultCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.data

  const response = await searchResearch('Works', {
    query,
    page: 1,
    limit: 1,
    include_facets: 0,
  }, signal)
  const data = { total: response.total }
  if (!signal.aborted && requestGeneration === cacheGeneration) {
    resultCache.set(cacheKey, { data, expiresAt: Date.now() + resultCacheTtlMs })
  }
  return data
}
