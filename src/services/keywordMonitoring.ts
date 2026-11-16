import { searchResearch } from './workerApi'
import { getProjectResearchData } from './projectResearchCache'

export type KeywordMonitoringResult = { total: number }

export function getKeywordMonitoringResult(projectId: string, query: string, signal: AbortSignal): Promise<KeywordMonitoringResult> {
  return getProjectResearchData(
    projectId,
    JSON.stringify(['keyword-match', query.trim().toLocaleLowerCase()]),
    async (requestSignal) => {
      const response = await searchResearch('Works', {
        query,
        page: 1,
        limit: 1,
        include_facets: 0,
      }, requestSignal)
      return { total: response.total }
    },
    signal,
  )
}
