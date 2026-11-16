import { signInWithCustomToken } from 'firebase/auth'
import { auth } from './firebase'
import { exchangeSsoAccessTokenForFirebaseCustomToken } from './workerApi'

const attemptKey = 'sjs.hyperdatalab.sso.attempt.v1'
const attemptLifetimeMs = 10 * 60 * 1000
const requiredScopes = ['email', 'profile', 'hyperdatalab_profile']

type SsoConfiguration = {
  baseUrl: URL
  callbackUrl: URL
  clientId: string
}

type SsoAttempt = {
  state: string
  verifier: string
  createdAt: number
}

type OAuthTokenResponse = {
  access_token?: unknown
  token_type?: unknown
}

type SsoUserInfo = {
  sub?: unknown
  email?: unknown
  email_verified?: unknown
}

function isSecureUrl(url: URL) {
  return url.protocol === 'https:' || (
    url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  )
}

function readConfiguration(): SsoConfiguration {
  const baseValue = import.meta.env.VITE_HYPERDATALAB_SSO_BASE_URL?.trim()
  const clientId = import.meta.env.VITE_HYPERDATALAB_SSO_CLIENT_ID?.trim()
  const callbackValue = import.meta.env.VITE_HYPERDATALAB_SSO_CALLBACK_URL?.trim()
  if (!baseValue || !clientId || !callbackValue) {
    throw new Error('HyperDataLab SSO is not configured. Set its public base URL, client ID, and exact callback URL.')
  }

  let baseUrl: URL
  let callbackUrl: URL
  try {
    baseUrl = new URL(baseValue)
    callbackUrl = new URL(callbackValue)
  } catch {
    throw new Error('The HyperDataLab SSO URL configuration is invalid.')
  }

  if (!isSecureUrl(baseUrl) || baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash || baseUrl.pathname !== '/') {
    throw new Error('The HyperDataLab SSO base URL must be an HTTPS origin (HTTP is allowed only on localhost).')
  }
  if (!isSecureUrl(callbackUrl) || callbackUrl.username || callbackUrl.password || callbackUrl.origin !== window.location.origin || callbackUrl.search || callbackUrl.hash || callbackUrl.pathname === '/') {
    throw new Error('The callback URL must be a secure path on this application origin and match the registered URL exactly.')
  }
  return { baseUrl, callbackUrl, clientId }
}

function randomBase64Url(byteLength: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function createCodeChallenge(verifier: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return randomBytesToBase64Url(new Uint8Array(digest))
}

function randomBytesToBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function providerMessage(code: string) {
  const normalized = code.toLocaleLowerCase()
  if (normalized === 'access_denied') return 'Sign-in was cancelled.'
  if (normalized.includes('profile_not_approved') || normalized.includes('not_active')) {
    return 'This HyperDataLab account is not active or approved. Contact your administrator.'
  }
  if (normalized.includes('invalid_client') || normalized.includes('redirect_uri') || normalized.includes('invalid_scope')) {
    return 'The SSO client settings do not match this application. Check the registered client and callback URL.'
  }
  return 'HyperDataLab could not complete sign-in. Please try again.'
}

function workerBridgeMessage(code: string) {
  if (code === 'user_account_not_active' || code === 'sso_identity_rejected' || code === 'sso_profile_incomplete') {
    return 'This HyperDataLab account is not active or approved. Contact your administrator.'
  }
  if (code.includes('not_configured')) return 'The SSO to Firebase connection is not configured. Contact your administrator.'
  return 'The SSO identity could not be connected to Firebase. Please try again.'
}

async function readJson<T>(response: Response): Promise<T | null> {
  return await response.json().catch(() => null) as T | null
}

function clearCallbackParameters() {
  window.history.replaceState(window.history.state, '', window.location.pathname)
}

function takeAttempt(): SsoAttempt | null {
  const value = sessionStorage.getItem(attemptKey)
  sessionStorage.removeItem(attemptKey)
  if (!value) return null
  try {
    const attempt = JSON.parse(value) as Partial<SsoAttempt>
    if (typeof attempt.state !== 'string' || typeof attempt.verifier !== 'string' || typeof attempt.createdAt !== 'number') return null
    return { state: attempt.state, verifier: attempt.verifier, createdAt: attempt.createdAt }
  } catch {
    return null
  }
}

export function hasSsoCallbackParameters() {
  const url = new URL(window.location.href)
  const configuredPath = import.meta.env.VITE_HYPERDATALAB_SSO_CALLBACK_URL?.trim()
  let callbackPath = '/auth/callback'
  if (configuredPath) {
    try {
      callbackPath = new URL(configuredPath).pathname
    } catch {
      // Leave the default path so malformed settings still show a recoverable login error.
    }
  }
  return url.pathname === callbackPath && ['code', 'state', 'error'].some((key) => url.searchParams.has(key))
}

export function getSsoConfigurationError() {
  try {
    readConfiguration()
    return ''
  } catch (error) {
    return error instanceof Error ? error.message : 'HyperDataLab SSO is not configured.'
  }
}

export async function startSsoLogin() {
  const config = readConfiguration()
  const state = randomBase64Url(32)
  const verifier = randomBase64Url(32)
  const challenge = await createCodeChallenge(verifier)
  const attempt: SsoAttempt = { state, verifier, createdAt: Date.now() }
  sessionStorage.setItem(attemptKey, JSON.stringify(attempt))

  const authorizeUrl = new URL('/oauth/authorize', config.baseUrl)
  authorizeUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.callbackUrl.toString(),
    scope: requiredScopes.join(' '),
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  }).toString()
  window.location.assign(authorizeUrl.toString())
}

export async function completeSsoLogin() {
  const callback = new URL(window.location.href)
  const code = callback.searchParams.get('code')
  const returnedState = callback.searchParams.get('state')
  const providerError = callback.searchParams.get('error')
  let attempt: SsoAttempt | null = null
  try {
    attempt = takeAttempt()
  } finally {
    clearCallbackParameters()
  }

  if (!attempt
    || !/^[A-Za-z0-9_-]{43,128}$/.test(attempt.state)
    || !/^[A-Za-z0-9_-]{43,128}$/.test(attempt.verifier)
    || Date.now() - attempt.createdAt > attemptLifetimeMs
    || Date.now() < attempt.createdAt) {
    throw new Error('The SSO sign-in expired. Start again to continue.')
  }
  if (!returnedState || returnedState !== attempt.state) {
    throw new Error('The SSO response could not be verified. Start sign-in again.')
  }
  if (providerError) throw new Error(providerMessage(providerError))
  if (!code) throw new Error('HyperDataLab did not return an authorization code. Start sign-in again.')

  const config = readConfiguration()
  let accessToken: string | null = null
  try {
    const tokenResponse = await fetch(new URL('/oauth/token', config.baseUrl), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        code,
        redirect_uri: config.callbackUrl.toString(),
        code_verifier: attempt.verifier,
      }),
      credentials: 'omit',
    })
    const tokenBody = await readJson<OAuthTokenResponse & { error?: unknown }>(tokenResponse)
    const receivedAccessToken = tokenBody?.access_token
    if (!tokenResponse.ok
      || typeof receivedAccessToken !== 'string'
      || receivedAccessToken.length < 20
      || receivedAccessToken.length > 8192
      || tokenBody?.token_type !== 'Bearer') {
      const codeValue = typeof tokenBody?.error === 'string' ? tokenBody.error : ''
      throw new Error(providerMessage(codeValue))
    }
    accessToken = receivedAccessToken

    const profileResponse = await fetch(new URL('/oauth/userinfo', config.baseUrl), {
      headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
      credentials: 'omit',
    })
    const profile = await readJson<SsoUserInfo>(profileResponse)
    if (!profileResponse.ok || typeof profile?.sub !== 'string' || !profile.sub.trim() || profile.email_verified !== true) {
      throw new Error('The signed-in HyperDataLab profile could not be verified.')
    }

    let customToken: string
    try {
      customToken = await exchangeSsoAccessTokenForFirebaseCustomToken(accessToken)
    } catch (error) {
      throw new Error(workerBridgeMessage(error instanceof Error ? error.message : ''))
    }
    await signInWithCustomToken(auth, customToken)
  } catch (error) {
    if (error instanceof TypeError) throw new Error('Could not connect to the SSO service. Check your connection and try again.')
    throw error
  } finally {
    if (accessToken) void revokeAccessToken(config.baseUrl, accessToken)
  }
}

async function revokeAccessToken(baseUrl: URL, accessToken: string) {
  try {
    await fetch(new URL('/oauth/revoke', baseUrl), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: accessToken }),
      credentials: 'omit',
    })
  } catch {
    // Firebase owns the resulting session; token revocation is best-effort after the bridge exchange.
  }
}
