export type ProjectTab = 'overview' | 'news-feed' | 'keywords-monitoring' | 'members'

export type LocalProject = {
  id: string
  name: string
  subjectAreaId: string
  subject: string
  topics: string[]
}
