export type ProjectTab = 'overview' | 'news-feed' | 'keywords-monitoring' | 'members'
export type ProjectStatus = 'active' | 'paused' | 'archived'

export type LocalProject = {
  id: string
  name: string
  subjectAreaId?: string
  subject: string
  topics: string[]
  status?: ProjectStatus
  updatedAt?: number
}
