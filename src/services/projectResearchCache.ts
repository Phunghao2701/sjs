import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

type InFlightRequest = {
  controller: AbortController
  promise: Promise<unknown>
}

const memoryCache = new Map<string, unknown>()
const inFlightRequests = new Map<string, InFlightRequest>()
let cacheGeneration = 0
const FIRESTORE_CACHE_TIMEOUT_MS = 2_500

export function clearProjectResearchCache() {
  cacheGeneration += 1
  memoryCache.clear()
  for (const request of inFlightRequests.values()) request.controller.abort()
  inFlightRequests.clear()
}

export async function getProjectResearchData<T>(
  projectId: string,
  cacheKey: string,
  load: (signal: AbortSignal) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (signal?.aborted) throw createAbortError()

  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Sign in before loading project research data.')

  const scopedCacheKey = JSON.stringify([userId, projectId, cacheKey])
  if (memoryCache.has(scopedCacheKey)) {
    return waitForCaller(Promise.resolve(memoryCache.get(scopedCacheKey) as T), signal)
  }

  let request = inFlightRequests.get(scopedCacheKey)
  if (!request) {
    const controller = new AbortController()
    const requestGeneration = cacheGeneration
    const nextRequest: InFlightRequest = { controller, promise: Promise.resolve(undefined) }

    nextRequest.promise = (async () => {
      const cacheDocumentId = await hashCacheKey(cacheKey)
      const cacheDocument = doc(db, 'users', userId, 'projects', projectId, 'researchCache', cacheDocumentId)
      let snapshot
      try {
        snapshot = await withTimeout(getDoc(cacheDocument), FIRESTORE_CACHE_TIMEOUT_MS, 'Firestore cache read')
      } catch (error) {
        if (controller.signal.aborted || requestGeneration !== cacheGeneration) throw createAbortError()
        console.warn('Could not read project research cache; loading fresh data instead.', error)
      }
      if (controller.signal.aborted || requestGeneration !== cacheGeneration) throw createAbortError()

      if (snapshot?.exists()) {
        const cached = snapshot.data()
        if (cached.version === 1 && (Array.isArray(cached.payload) || isRecord(cached.payload))) {
          memoryCache.set(scopedCacheKey, cached.payload)
          return cached.payload as T
        }
      }

      const payload = await load(controller.signal)
      if (controller.signal.aborted || requestGeneration !== cacheGeneration) throw createAbortError()
      const persistedPayload = JSON.parse(JSON.stringify(payload)) as T

      try {
        await withTimeout(setDoc(cacheDocument, {
          version: 1,
          payload: persistedPayload,
          updatedAt: serverTimestamp(),
        }), FIRESTORE_CACHE_TIMEOUT_MS, 'Firestore cache write')
      } catch (error) {
        if (controller.signal.aborted || requestGeneration !== cacheGeneration) throw createAbortError()
        console.warn('Could not save project research cache; using the loaded data for this session.', error)
      }

      if (controller.signal.aborted || requestGeneration !== cacheGeneration || auth.currentUser?.uid !== userId) {
        throw createAbortError()
      }

      memoryCache.set(scopedCacheKey, persistedPayload)
      return persistedPayload
    })().finally(() => {
      if (inFlightRequests.get(scopedCacheKey) === nextRequest) inFlightRequests.delete(scopedCacheKey)
    })

    inFlightRequests.set(scopedCacheKey, nextRequest)
    request = nextRequest
  }

  return waitForCaller(request.promise as Promise<T>, signal)
}

function waitForCaller<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise
  if (signal.aborted) return Promise.reject(createAbortError())

  return new Promise<T>((resolve, reject) => {
    const cleanup = () => signal.removeEventListener('abort', abort)
    const abort = () => {
      cleanup()
      reject(createAbortError())
    }

    signal.addEventListener('abort', abort, { once: true })
    promise.then((value) => {
      cleanup()
      if (signal.aborted) reject(createAbortError())
      else resolve(value)
    }, (error: unknown) => {
      cleanup()
      reject(error)
    })
  })
}

function createAbortError() {
  return new DOMException('The operation was aborted.', 'AbortError')
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  let timeoutId: number | undefined
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error(`${operation} timed out after ${timeoutMs / 1000} seconds.`)), timeoutMs)
    }),
  ]).finally(() => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId)
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function hashCacheKey(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return `v1-${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`
}
