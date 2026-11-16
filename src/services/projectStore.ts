import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import type { LocalProject } from '../types/project'

export type NewProject = Pick<LocalProject, 'name' | 'subject' | 'topics' | 'subjectAreaId'>

function projectsCollection() {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Sign in before saving or loading projects.')
  return collection(db, 'users', userId, 'projects')
}

function timestampToMilliseconds(value: unknown) {
  if (value instanceof Timestamp) return value.toMillis()
  if (value instanceof Date) return value.getTime()
  return typeof value === 'number' ? value : undefined
}

function toLocalProject(id: string, data: Record<string, unknown>): LocalProject {
  const status = data.status === 'paused' || data.status === 'archived' ? data.status : 'active'
  return {
    id,
    name: typeof data.title === 'string' ? data.title : '',
    subjectAreaId: '',
    subject: typeof data.subjectArea === 'string' ? data.subjectArea : '',
    topics: Array.isArray(data.keywords) ? data.keywords.filter((value): value is string => typeof value === 'string') : [],
    status,
    updatedAt: timestampToMilliseconds(data.updatedAt) ?? timestampToMilliseconds(data.createdAt),
  }
}

export async function listMyProjects(): Promise<LocalProject[]> {
  const snapshot = await getDocs(query(projectsCollection(), orderBy('createdAt', 'desc')))
  return snapshot.docs.map((project) => toLocalProject(project.id, project.data()))
}

export async function createProjectInFirestore(project: NewProject): Promise<LocalProject> {
  const reference = doc(projectsCollection())
  await setDoc(reference, {
    title: project.name.trim(),
    subjectArea: project.subject.trim(),
    keywords: project.topics,
    status: 'active',
    analysisStatus: 'not_started',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return { ...project, id: reference.id, status: 'active', updatedAt: Date.now() }
}

export async function updateProjectTopicsInFirestore(projectId: string, topics: string[]) {
  await updateDoc(doc(projectsCollection(), projectId), {
    keywords: topics,
    updatedAt: serverTimestamp(),
  })
}
