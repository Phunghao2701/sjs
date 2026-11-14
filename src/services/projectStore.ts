import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import type { LocalProject } from '../types/project'

export type NewProject = Pick<LocalProject, 'name' | 'subject' | 'topics' | 'subjectAreaId'>

function projectsCollection() {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Sign in before saving or loading projects.')
  return collection(db, 'users', userId, 'projects')
}

function toLocalProject(id: string, data: Record<string, unknown>): LocalProject {
  return {
    id,
    name: typeof data.title === 'string' ? data.title : '',
    subjectAreaId: '',
    subject: typeof data.subjectArea === 'string' ? data.subjectArea : '',
    topics: Array.isArray(data.keywords) ? data.keywords.filter((value): value is string => typeof value === 'string') : [],
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
  return { ...project, id: reference.id }
}
